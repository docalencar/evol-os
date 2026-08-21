-- ---------------------------------------------------------------------------
-- 0107 — Trusted Organization Sync Execution boundary.
--
-- Import "Apply" currently runs through direct-DML repositories (privilege-dead
-- for the authenticated role) and persists the Timeline with a direct insert
-- into a table whose `receipts` column never materialised (migration-ordering
-- defect: 0035 altered before 0040 created the table). This migration closes
-- the execution side of the Career/Seniority + Position taxonomy program by
-- introducing a single SECURITY DEFINER execution boundary that:
--
--   * composes the existing trusted create RPCs (department / team / position /
--     person) — no domain logic is duplicated;
--   * runs each item in its own PL/pgSQL subtransaction (Option B) so a failed
--     item rolls back only itself while successful items stay pending in the
--     outer transaction;
--   * writes the Timeline row itself, inside the SAME outer transaction, so a
--     Timeline failure rolls the WHOLE execution back (no successful entity
--     write may commit without its Timeline row);
--   * is idempotent at the execution level via (company_id, execution_id) plus
--     an intent fingerprint computed DB-side from the canonicalised items;
--   * never exposes or stores raw SQLERRM — item failures are reduced to a
--     stable allow-listed code (unknown -> SYNC_ITEM_FAILED).
--
-- Forward-only and additive. No table grants are added; no RLS is weakened; the
-- authenticated role still reaches organisation data ONLY through the existing
-- SECURITY DEFINER read/write RPCs. Old migrations (0035/0040/0089/0104/0106)
-- are left untouched.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- A. Additive schema on organization_sync_timeline.
-- ---------------------------------------------------------------------------

-- The `receipts` column that 0035 intended but never created (guard was false
-- because 0040 had not yet created the table). Additive and idempotent.
alter table public.organization_sync_timeline
  add column if not exists receipts jsonb not null default '[]'::jsonb;

-- Canonical execution identity + intent fingerprint. Nullable so pre-existing
-- rows (which predate execution identity) remain valid.
alter table public.organization_sync_timeline
  add column if not exists execution_id text;

alter table public.organization_sync_timeline
  add column if not exists intent_fingerprint text;

-- Exactly one Timeline row per (company_id, execution_id). Partial so legacy
-- rows with a NULL execution_id never collide. This is the concurrency backstop
-- behind the advisory lock taken by the execution RPC.
create unique index if not exists organization_sync_timeline_company_execution_key
  on public.organization_sync_timeline (company_id, execution_id)
  where execution_id is not null;

-- ---------------------------------------------------------------------------
-- B. Internal helpers (not part of the public API surface).
-- ---------------------------------------------------------------------------

-- Deterministic, extension-free name normalisation mirroring the app's
-- NFD-strip + collapse-whitespace + trim + lowercase (unaccent is not enabled
-- in this database). Used only for by-name dependency resolution during an
-- execution — NOT for the intent fingerprint (which relies on jsonb identity).
create or replace function public.organization_sync_normalize_text(
  p_value text
)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select lower(
    btrim(
      regexp_replace(
        translate(
          coalesce(p_value, ''),
          'ÀÁÂÃÄÅàáâãäåÇçÈÉÊËèéêëÌÍÎÏìíîïÑñÒÓÔÕÖØòóôõöøÙÚÛÜùúûüÝýÿ',
          'AAAAAAaaaaaaCcEEEEeeeeIIIIiiiiNnOOOOOOooooooUUUUuuuuYyy'
        ),
        '\s+', ' ', 'g'
      )
    )
  );
$$;

revoke all on function public.organization_sync_normalize_text(text)
  from public, anon, authenticated, service_role;

-- Reduce a caught (sqlstate, message) pair to a stable, client-safe code.
-- The nested trusted RPCs raise `message = '<STABLE_CODE>'`; those are passed
-- through when allow-listed. Anything else becomes the generic SYNC_ITEM_FAILED
-- so raw SQLERRM never reaches stored/returned JSON.
create or replace function public.organization_sync_error_code(
  p_sqlstate text,
  p_message text
)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_message in (
      -- Nested trusted-RPC stable codes.
      'VALIDATION_FAILED',
      'TENANT_REFERENCE_INVALID',
      'IDEMPOTENCY_CONFLICT',
      'CONFLICT',
      'ORGANIZATION_HIERARCHY_CYCLE',
      'PERSON_ACCESS_CONFLICT',
      'PERSON_NOT_FOUND',
      'ORGANIZATION_ENTITY_NOT_FOUND',
      'SENIORITY_LEVEL_NOT_FOUND',
      'SENIORITY_LEVEL_ARCHIVED',
      'POSITION_SENIORITY_PROFILE_NOT_FOUND',
      'POSITION_SENIORITY_PROFILE_ARCHIVED',
      'POSITION_SENIORITY_PROFILE_POSITION_MISMATCH',
      'AUTHENTICATION_REQUIRED',
      'TENANT_AUTHORIZATION_DENIED',
      -- Execution-boundary codes raised by this RPC itself.
      'SYNC_DEPENDENCY_NOT_FOUND',
      'SYNC_UNSUPPORTED_OPERATION'
    ) then p_message
    else 'SYNC_ITEM_FAILED'
  end;
$$;

revoke all on function public.organization_sync_error_code(text, text)
  from public, anon, authenticated, service_role;

-- Safe, generic PT-BR message for a stable code. Stored in the Timeline
-- `errors[].message` so the existing (untouched) reader keeps rendering human
-- text; the app cutover will map `errors[].code` to richer copy later.
create or replace function public.organization_sync_error_message(
  p_code text
)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_code
    when 'SYNC_DEPENDENCY_NOT_FOUND'
      then 'Uma dependência do item (departamento, cargo, time ou gestor) não foi encontrada.'
    when 'SYNC_UNSUPPORTED_OPERATION'
      then 'A operação solicitada para este item ainda não é suportada.'
    when 'VALIDATION_FAILED'
      then 'Os dados deste item são inválidos.'
    when 'TENANT_REFERENCE_INVALID'
      then 'Uma referência deste item não pertence à organização.'
    when 'IDEMPOTENCY_CONFLICT'
      then 'Este item conflita com um envio anterior com a mesma identidade.'
    when 'SENIORITY_LEVEL_NOT_FOUND'
      then 'Uma senioridade informada para este item não foi encontrada.'
    else 'Não foi possível aplicar este item.'
  end;
$$;

revoke all on function public.organization_sync_error_message(text)
  from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- C. Execution boundary: apply_tenant_organization_sync_plan_v1.
--
-- Input:
--   p_company_id   uuid
--   p_execution_id text  -- stable per Apply attempt; reused verbatim on retry
--   p_items        jsonb -- array of { id, entity, operation, desired:{...} }
--
-- Returns the execution report as jsonb (Timeline-compatible), plus status,
-- timelineId and executionId.
-- ---------------------------------------------------------------------------
create or replace function public.apply_tenant_organization_sync_plan_v1(
  p_company_id uuid,
  p_execution_id text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid;
  v_execution_id text := btrim(p_execution_id);
  v_fingerprint text;
  v_existing public.organization_sync_timeline%rowtype;

  v_started timestamptz := clock_timestamp();
  v_finished timestamptz;
  v_duration integer;

  v_entities text[] := array['department', 'team', 'position', 'employee'];
  v_operations text[] := array[
    'create', 'update', 'move', 'archive', 'restore', 'unchanged', 'conflict'
  ];
  v_entity_name text;
  v_op_name text;

  v_row record;
  v_item jsonb;
  v_ord bigint;
  v_item_id text;
  v_op text;
  v_desired jsonb;
  v_item_key text;
  v_result jsonb;
  v_entity_id uuid;
  v_code text;

  v_dep_name text;
  v_dep_id uuid;
  v_team_id uuid;
  v_position_id uuid;
  v_manager_id uuid;

  v_receipts jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_outcomes jsonb := '[]'::jsonb;

  v_applied integer := 0;
  v_skipped integer := 0;
  v_failed integer := 0;

  v_entity_summary jsonb := '{}'::jsonb;
  v_operation_summary jsonb := '{}'::jsonb;
  v_bucket jsonb;

  v_timeline_id uuid;
begin
  -- 1. Authorise (actor resolved from auth.uid(); owner/admin/hr only). Nested
  --    RPCs re-check the same real actor, so authority is enforced end to end.
  v_actor := public.require_people_organization_mutator(p_company_id);

  -- 2. Validate inputs.
  if nullif(v_execution_id, '') is null
    or char_length(v_execution_id) > 200
    or p_items is null
    or jsonb_typeof(p_items) <> 'array'
  then
    raise exception using errcode = '22023', message = 'VALIDATION_FAILED';
  end if;

  -- 3. Intent fingerprint, computed DB-side from canonicalised items. Order is
  --    normalised (sort by element text) so array reordering is not a new
  --    intent; jsonb key ordering is already canonical.
  v_fingerprint := encode(extensions.digest((
    select coalesce(jsonb_agg(elem order by elem::text), '[]'::jsonb)::text
    from (
      select jsonb_build_object(
        'entity', e.value ->> 'entity',
        'operation', e.value ->> 'operation',
        'desired', coalesce(e.value -> 'desired', '{}'::jsonb)
      ) as elem
      from jsonb_array_elements(p_items) as e
    ) as canonical
  ), 'sha256'), 'hex');

  -- 4. Serialise concurrent identical submits; the unique index is the backstop.
  perform pg_advisory_xact_lock(
    hashtextextended(p_company_id::text || ':org-sync-exec:' || v_execution_id, 0)
  );

  -- 5. Execution-level idempotency.
  select * into v_existing
  from public.organization_sync_timeline
  where company_id = p_company_id and execution_id = v_execution_id;

  if found then
    if v_existing.intent_fingerprint is distinct from v_fingerprint then
      -- Same identity, different intent — refuse (no partial mixed state).
      raise exception using errcode = '23505', message = 'SYNC_EXECUTION_CONFLICT';
    end if;
    -- Same identity, same intent — return the stored result, no re-execution.
    return jsonb_build_object(
      'status', 'idempotent_retry',
      'timelineId', v_existing.id,
      'executionId', v_existing.execution_id,
      'startedAt', v_existing.started_at,
      'finishedAt', v_existing.finished_at,
      'duration', v_existing.duration_ms,
      'appliedItems', v_existing.applied_items,
      'skippedItems', v_existing.skipped_items,
      'failedItems', v_existing.failed_items,
      'entitySummary', v_existing.entity_summary,
      'operationSummary', v_existing.operation_summary,
      'warnings', v_existing.warnings,
      'errors', v_existing.errors,
      'receipts', v_existing.receipts
    );
  end if;

  -- 6. Apply items in fixed dependency order. Within an entity, input order is
  --    preserved (WITH ORDINALITY) so intra-execution references resolve.
  foreach v_entity_name in array v_entities loop
    for v_row in
      select value, ordinality
      from jsonb_array_elements(p_items) with ordinality as a(value, ordinality)
      where a.value ->> 'entity' = v_entity_name
      order by a.ordinality
    loop
      v_item := v_row.value;
      v_ord := v_row.ordinality;
      v_item_id := coalesce(nullif(v_item ->> 'id', ''), 'item-' || v_ord::text);
      v_op := coalesce(v_item ->> 'operation', '');
      v_desired := coalesce(v_item -> 'desired', '{}'::jsonb);

      -- Per-item subtransaction: an exception here rolls back only this item.
      begin
        if v_op <> 'create' then
          raise exception using errcode = '22023', message = 'SYNC_UNSUPPORTED_OPERATION';
        end if;

        -- Deterministic per-(execution, item) key so a retry of this exact
        -- execution re-invokes the nested RPC idempotently (crash-safe backstop).
        v_item_key := encode(
          extensions.digest(v_execution_id || ':' || v_item_id, 'sha256'), 'hex'
        );

        if v_entity_name = 'department' then
          v_result := public.create_tenant_department_v1(
            p_company_id,
            v_desired ->> 'name',
            nullif(btrim(v_desired ->> 'description'), ''),
            null,
            v_item_key
          );
          v_entity_id := (v_result ->> 'departmentId')::uuid;

        elsif v_entity_name = 'team' then
          v_result := public.create_tenant_team_v1(
            p_company_id,
            v_desired ->> 'name',
            null,
            null,
            null,
            null,
            v_item_key
          );
          v_entity_id := (v_result ->> 'teamId')::uuid;

        elsif v_entity_name = 'position' then
          v_dep_name := nullif(btrim(v_desired ->> 'department'), '');
          v_dep_id := null;
          if v_dep_name is not null then
            select d.id into v_dep_id
            from public.departments d
            where d.company_id = p_company_id
              and d.deleted_at is null
              and public.organization_sync_normalize_text(d.name)
                = public.organization_sync_normalize_text(v_dep_name)
            order by d.created_at, d.id
            limit 1;
            if v_dep_id is null then
              raise exception using errcode = 'P0002', message = 'SYNC_DEPENDENCY_NOT_FOUND';
            end if;
          end if;

          v_result := public.create_tenant_position_with_seniorities_v1(
            p_company_id,
            v_desired ->> 'name',
            null,
            v_dep_id,
            'analyst',
            'active',
            44,
            'on_site',
            'clt',
            'none',
            v_item_key,
            '{}'::uuid[]
          );
          v_entity_id := (v_result ->> 'positionId')::uuid;

        elsif v_entity_name = 'employee' then
          v_team_id := null;
          v_position_id := null;
          v_manager_id := null;

          v_dep_name := nullif(btrim(v_desired ->> 'team'), '');
          if v_dep_name is not null then
            select t.id into v_team_id
            from public.teams t
            where t.company_id = p_company_id
              and t.deleted_at is null
              and public.organization_sync_normalize_text(t.name)
                = public.organization_sync_normalize_text(v_dep_name)
            order by t.created_at, t.id
            limit 1;
            if v_team_id is null then
              raise exception using errcode = 'P0002', message = 'SYNC_DEPENDENCY_NOT_FOUND';
            end if;
          end if;

          v_dep_name := nullif(btrim(v_desired ->> 'position'), '');
          if v_dep_name is not null then
            select p.id into v_position_id
            from public.positions p
            where p.company_id = p_company_id
              and p.deleted_at is null
              and public.organization_sync_normalize_text(p.name)
                = public.organization_sync_normalize_text(v_dep_name)
            order by p.created_at, p.id
            limit 1;
            if v_position_id is null then
              raise exception using errcode = 'P0002', message = 'SYNC_DEPENDENCY_NOT_FOUND';
            end if;
          end if;

          v_dep_name := nullif(btrim(v_desired ->> 'manager'), '');
          if v_dep_name is not null then
            select pe.id into v_manager_id
            from public.people pe
            where pe.company_id = p_company_id
              and pe.status <> 'terminated'
              and public.organization_sync_normalize_text(pe.full_name)
                = public.organization_sync_normalize_text(v_dep_name)
            order by pe.created_at, pe.id
            limit 1;
            if v_manager_id is null then
              raise exception using errcode = 'P0002', message = 'SYNC_DEPENDENCY_NOT_FOUND';
            end if;
          end if;

          v_result := public.create_tenant_person_v2(
            p_company_id,
            v_desired ->> 'fullName',
            nullif(btrim(v_desired ->> 'email'), ''),
            null,
            null,
            null,
            'active',
            v_team_id,
            v_position_id,
            v_manager_id,
            null,
            v_item_key,
            null
          );
          v_entity_id := (v_result ->> 'personId')::uuid;

        else
          raise exception using errcode = '22023', message = 'SYNC_UNSUPPORTED_OPERATION';
        end if;

        if v_entity_id is null then
          raise exception using errcode = 'P0002', message = 'ORGANIZATION_ENTITY_NOT_FOUND';
        end if;

        v_receipts := v_receipts || jsonb_build_object(
          'itemId', v_item_id,
          'entity', v_entity_name,
          'operation', v_op,
          'entityId', v_entity_id::text
        );
        v_outcomes := v_outcomes || jsonb_build_object(
          'entity', v_entity_name, 'operation', v_op, 'status', 'applied'
        );
        v_applied := v_applied + 1;

      exception
        when others then
          -- Diagnostics stay server-side only; never surfaced to the client.
          get stacked diagnostics v_code = returned_sqlstate;
          raise log 'apply_tenant_organization_sync_plan_v1: item % (%/%) failed sqlstate=% detail=%',
            v_item_id, v_entity_name, v_op, v_code, sqlerrm;
          v_code := public.organization_sync_error_code(v_code, sqlerrm);
          v_errors := v_errors || jsonb_build_object(
            'itemId', v_item_id,
            'entity', v_entity_name,
            'operation', coalesce(nullif(v_op, ''), 'create'),
            'code', v_code,
            'message', public.organization_sync_error_message(v_code)
          );
          v_outcomes := v_outcomes || jsonb_build_object(
            'entity', v_entity_name,
            'operation', coalesce(nullif(v_op, ''), 'create'),
            'status', 'failed'
          );
          v_failed := v_failed + 1;
      end;
    end loop;
  end loop;

  -- 7. Build the entity/operation summaries with every key present (readers
  --    expect the full scaffold), derived from the actual per-item outcomes.
  foreach v_entity_name in array v_entities loop
    select jsonb_build_object(
      'appliedItems', count(*) filter (where o ->> 'status' = 'applied'),
      'skippedItems', count(*) filter (where o ->> 'status' = 'skipped'),
      'failedItems', count(*) filter (where o ->> 'status' = 'failed')
    )
    into v_bucket
    from jsonb_array_elements(v_outcomes) as x(o)
    where o ->> 'entity' = v_entity_name;
    v_entity_summary := v_entity_summary || jsonb_build_object(v_entity_name, v_bucket);
  end loop;

  foreach v_op_name in array v_operations loop
    select jsonb_build_object(
      'appliedItems', count(*) filter (where o ->> 'status' = 'applied'),
      'skippedItems', count(*) filter (where o ->> 'status' = 'skipped'),
      'failedItems', count(*) filter (where o ->> 'status' = 'failed')
    )
    into v_bucket
    from jsonb_array_elements(v_outcomes) as x(o)
    where o ->> 'operation' = v_op_name;
    v_operation_summary := v_operation_summary || jsonb_build_object(v_op_name, v_bucket);
  end loop;

  -- 8. Persist the Timeline row — inside the SAME outer transaction, OUTSIDE any
  --    per-item exception block. If this insert fails the whole execution rolls
  --    back, so no successful entity write can commit without its Timeline row.
  v_finished := clock_timestamp();
  v_duration := greatest(
    0,
    floor(extract(epoch from (v_finished - v_started)) * 1000)::integer
  );

  insert into public.organization_sync_timeline (
    company_id,
    started_at,
    finished_at,
    duration_ms,
    applied_items,
    skipped_items,
    failed_items,
    entity_summary,
    operation_summary,
    warnings,
    errors,
    receipts,
    created_by,
    execution_id,
    intent_fingerprint
  ) values (
    p_company_id,
    v_started,
    v_finished,
    v_duration,
    v_applied,
    v_skipped,
    v_failed,
    v_entity_summary,
    v_operation_summary,
    '[]'::jsonb,
    v_errors,
    v_receipts,
    v_actor,
    v_execution_id,
    v_fingerprint
  )
  returning id into v_timeline_id;

  return jsonb_build_object(
    'status', 'succeeded',
    'timelineId', v_timeline_id,
    'executionId', v_execution_id,
    'startedAt', v_started,
    'finishedAt', v_finished,
    'duration', v_duration,
    'appliedItems', v_applied,
    'skippedItems', v_skipped,
    'failedItems', v_failed,
    'entitySummary', v_entity_summary,
    'operationSummary', v_operation_summary,
    'warnings', '[]'::jsonb,
    'errors', v_errors,
    'receipts', v_receipts
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- D. Least-privilege execute grants. No new table grants; no RLS change.
-- ---------------------------------------------------------------------------
revoke all on function public.apply_tenant_organization_sync_plan_v1(uuid, text, jsonb)
  from public, anon, service_role;

grant execute on function public.apply_tenant_organization_sync_plan_v1(uuid, text, jsonb)
  to authenticated;

notify pgrst, 'reload schema';
