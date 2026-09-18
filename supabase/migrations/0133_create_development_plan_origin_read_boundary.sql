-- D-DB2 — historical Development plan origin read boundary.
--
-- WHY THIS EXISTS
--
-- The product labels a field on an existing plan "Template de origem". That is a
-- HISTORICAL claim — which template produced this plan — and not a question about
-- what the viewer may browse today. No boundary answered it. The two functions
-- that return a template name both answer a different question:
--
--   get_tenant_development_templates_management_v1 (0087) is the tenant-wide
--     administrative reader D-DB1/D-P2 retired, and it filters `active = true`.
--   get_published_development_template_catalog_v1 (0131) returns the published
--     catalog, which by construction omits every obsoleted origin.
--
-- Under either one, obsoleting a template silently erases the recorded origin of
-- every plan ever built from it. The data was never lost; there was simply no
-- participant-safe way to read it.
--
-- WHAT THE CANONICAL HISTORICAL EVIDENCE IS
--
-- `development_template_application_snapshots.snapshot`, reached through
-- `development_template_application_lineage`. That choice is not convenience —
-- it is the only source the schema actually protects:
--
--   * The snapshot is server-VERIFIED. Before persisting it,
--     complete_development_template_application_v1 (0069/0132) requires the live
--     version row to match it field for field — `version.name`,
--     `version.version_number`, `version.template_id`, scope, description and
--     duration — with the version in `published` state. A snapshot therefore
--     records what the database itself confirmed at application time, not what a
--     client asserted.
--   * The snapshot is IMMUTABLE BY TRIGGER, not by convention. Any UPDATE or
--     DELETE on the snapshot or lineage tables raises
--     DEVELOPMENT_TEMPLATE_APPLICATION_HISTORY_IMMUTABLE (0068). No trusted
--     function writes them twice, and none could.
--   * Lineage is UNIQUE per (plan_id, company_id) and every foreign key in the
--     chain is ON DELETE RESTRICT, so the plan cannot be severed from its origin.
--
-- By contrast `development_plans.template_id` — added by 0011, the very migration
-- named "add template origin to development plans" — is declared
-- `on delete set null`. It is a convenience pointer that the database is willing
-- to forget, and it is the reason the lineage ledger was built. It is not used
-- here as evidence.
--
-- `development_template_versions.name` would give the same answer today: no
-- trusted function ever updates it, and protect_development_template_version()
-- rejects any published/obsolete update whose `new.name <> old.name`. The
-- snapshot is preferred anyway, for a reason that outlives that coincidence —
-- reading it means this function never touches a template table at all, so there
-- is no path by which lifecycle, authoring or catalog state could leak, and no
-- future rename could quietly redefine history.
--
-- WHAT IT DELIBERATELY DOES NOT ANSWER
--
-- Not "what may this actor browse". The five returned columns carry no status, no
-- `active` flag, no scope, no revision, no author, no goals or actions, no other
-- plan and no other employee. The snapshot holds far more than this; only the
-- origin label is projected out of it.
--
-- NON-TEMPLATE PLANS
--
-- A plan created by create_development_plan_v1 has no lineage and therefore no
-- row here. That is the whole semantic: a row means "this plan has durable,
-- verified origin evidence". A caller composes this reader with
-- get_authorized_development_plans_v1 — which it already calls — and the
-- difference between the two sets is exactly "authorized plans with no template
-- origin". The product may render that as "Sem template de origem"; what it must
-- never do is invent a name, or read the current catalog and call the answer
-- history.
--
-- An UNAUTHORIZED caller sees neither set, so the distinction is available only to
-- someone already entitled to the plan. Absence is never an oracle: a nonexistent
-- plan, a foreign plan and a same-company plan the viewer may not read are all
-- zero rows, indistinguishable from one another and from a plan that simply had
-- no template.
--
-- WHY A DEDICATED BOUNDARY RATHER THAN MORE COLUMNS ON THE PLAN READER
--
-- Extending get_authorized_development_plans_v1 would mean changing its RETURNS
-- TABLE, which PostgreSQL cannot do with CREATE OR REPLACE — it requires dropping
-- and recreating a published boundary that live consumers depend on. It would
-- also make every plan read pay for a lineage and snapshot join it does not use,
-- and would fold provenance into the plan-data contract that D-P0 keeps separate.
-- A second reader, shaped exactly like the other D-DB1 set-based reads
-- (p_company_id, optional p_plan_id, authorization applied per returned row), adds
-- no coupling and no privilege.

create function public.get_authorized_development_plan_origins_v1(
  p_company_id uuid,
  p_plan_id uuid default null
) returns table (
  plan_id uuid,
  template_id uuid,
  template_version_id uuid,
  template_name text,
  template_version_number integer
)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'AUTHENTICATION_REQUIRED';
  end if;
  if not public.is_company_member(p_company_id) then
    raise exception using errcode = '42501', message = 'TENANT_AUTHORIZATION_DENIED';
  end if;

  -- Identities come from lineage, where they are typed columns held in place by
  -- foreign keys; the container id and the labels come from the snapshot, where
  -- they were verified against the live version row at application time. 0069
  -- refuses to persist a resolution whose lineage and snapshot disagree on
  -- templateId or templateVersionNumber, so the two sources cannot drift apart.
  --
  -- The integer cast is safe by construction: the same expression,
  -- `(snapshot #>> '{template,versionNumber}')::integer`, is evaluated by
  -- complete_development_template_application_v1 before the snapshot is allowed
  -- to exist. A row that could not survive this cast was never written.
  return query
  select
    lineage.plan_id,
    (snapshot.snapshot #>> '{template,id}')::uuid,
    lineage.template_version_id,
    snapshot.snapshot #>> '{template,name}',
    (snapshot.snapshot #>> '{template,versionNumber}')::integer
  from public.development_plans plan
  join public.development_template_application_lineage lineage
    on lineage.plan_id = plan.id
   and lineage.company_id = plan.company_id
  join public.development_template_application_snapshots snapshot
    on snapshot.id = lineage.snapshot_id
   and snapshot.company_id = lineage.company_id
  where plan.company_id = p_company_id
    and (p_plan_id is null or plan.id = p_plan_id)
    -- The canonical D-DB1 predicate, reused rather than restated. Subject,
    -- current manager, active explicit operational owner and owner/admin/hr all
    -- follow from it, and any later change to the plan actor matrix reaches this
    -- reader automatically instead of drifting away from it.
    and public.can_read_development_plan_v1(plan.id)
  order by plan.created_at desc, plan.id;
end;
$$;

comment on function public.get_authorized_development_plan_origins_v1(uuid, uuid) is
  'Historical template origin for Development plans the caller may already read. '
  'Answers "which template version produced this plan" from the immutable, '
  'trigger-protected application snapshot and lineage — never from the current '
  'catalog, and never from development_plans.template_id, which is ON DELETE SET '
  'NULL. Returns no row for a plan with no template origin, and no row for a plan '
  'the caller may not read; the two are indistinguishable to anyone not already '
  'authorized. Exposes no lifecycle status, active flag, scope, revision, author '
  'or template content.';

-- Closed to everyone, then opened to exactly one role — the D-DB1 grant model.
-- service_role is denied here as it is for every other Development read boundary:
-- this function derives the actor from auth.uid(), and a role that bypasses that
-- derivation has no business holding it.
revoke all on function public.get_authorized_development_plan_origins_v1(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function public.get_authorized_development_plan_origins_v1(uuid, uuid)
to authenticated;

-- No table, column, policy, privilege or trigger is added or altered by this
-- migration, so the 0126 four-ledger retention contract and every existing RLS
-- fingerprint are untouched by construction.

notify pgrst, 'reload schema';
