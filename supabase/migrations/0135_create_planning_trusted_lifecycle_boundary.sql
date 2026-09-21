-- PLN-DB1 — trusted Organization Planning lifecycle and durable audit.

create table public.organization_planning_lifecycle_audit (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  scenario_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  actor_role text not null check (actor_role in ('owner','admin','hr')),
  event_type text not null check (event_type in (
    'planning.scenario.submitted','planning.scenario.approved',
    'planning.scenario.rejected','planning.scenario.revision_started',
    'planning.scenario.published'
  )),
  from_status text not null,
  to_status text not null,
  resulting_version integer not null check (resulting_version > 0),
  reason text constraint organization_planning_lifecycle_audit_reason_length_check
    check (reason is null or char_length(reason) between 1 and 500),
  idempotency_key uuid not null unique,
  intent_fingerprint text not null check (btrim(intent_fingerprint) <> ''),
  occurred_at timestamptz not null default clock_timestamp(),
  constraint organization_planning_lifecycle_audit_scenario_company_fk
    foreign key (scenario_id, company_id)
    references public.organization_planning_scenarios(id, company_id)
    on delete restrict,
  constraint organization_planning_lifecycle_audit_reason_presence_check check (
    (event_type = 'planning.scenario.rejected' and reason is not null)
    or (event_type <> 'planning.scenario.rejected' and reason is null)
  )
);

create index organization_planning_lifecycle_audit_scenario_idx
  on public.organization_planning_lifecycle_audit(company_id, scenario_id, occurred_at, id);

alter table public.organization_planning_lifecycle_audit enable row level security;
revoke all on table public.organization_planning_lifecycle_audit
from public, anon, authenticated;
grant select on table public.organization_planning_lifecycle_audit to service_role;

create function public.protect_planning_lifecycle_audit_v1()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  raise exception using errcode='55000',message='PLANNING_LIFECYCLE_AUDIT_APPEND_ONLY';
end; $$;

create trigger protect_planning_lifecycle_audit_append_only
before update or delete on public.organization_planning_lifecycle_audit
for each row execute function public.protect_planning_lifecycle_audit_v1();

create function public.transition_planning_scenario_v1(
  p_scenario_id uuid,
  p_transition text,
  p_expected_version integer,
  p_idempotency_key uuid,
  p_reason text default null
) returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $$
declare
  v_scenario public.organization_planning_scenarios%rowtype;
  v_existing public.organization_planning_lifecycle_audit%rowtype;
  v_role text;
  v_from text;
  v_to text;
  v_event text;
  v_reason text := nullif(btrim(p_reason), '');
  v_now timestamptz;
  v_fingerprint text;
begin
  if auth.uid() is null then
    raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED';
  end if;
  if p_idempotency_key is null or p_expected_version is null or p_expected_version < 1 then
    raise exception using errcode='22023',message='PLANNING_LIFECYCLE_INPUT_INVALID';
  end if;
  if p_transition not in ('submit','approve','reject','revise') then
    raise exception using errcode='22023',message='PLANNING_LIFECYCLE_TRANSITION_UNKNOWN';
  end if;
  if p_transition = 'reject' then
    if v_reason is null or char_length(v_reason) > 500 then
      raise exception using errcode='22023',message='PLANNING_REJECTION_REASON_INVALID';
    end if;
  elsif v_reason is not null then
    raise exception using errcode='22023',message='PLANNING_REASON_NOT_ALLOWED';
  end if;

  v_fingerprint := concat_ws(':',p_scenario_id,p_transition,p_expected_version,coalesce(v_reason,''));
  select * into v_existing from public.organization_planning_lifecycle_audit
  where idempotency_key=p_idempotency_key;
  if found then
    if v_existing.actor_user_id<>auth.uid()
      or v_existing.scenario_id<>p_scenario_id
      or v_existing.intent_fingerprint<>v_fingerprint then
      raise exception using errcode='23505',message='PLANNING_IDEMPOTENCY_CONFLICT';
    end if;
    select * into v_scenario from public.organization_planning_scenarios
    where id=p_scenario_id and company_id=v_existing.company_id;
    return jsonb_build_object('scenarioId',v_scenario.id,'status',v_scenario.status,
      'version',v_scenario.version,'updatedAt',v_scenario.updated_at,
      'auditId',v_existing.id,'idempotent',true);
  end if;

  select * into v_scenario from public.organization_planning_scenarios
  where id=p_scenario_id for update;
  if not found then
    raise exception using errcode='P0002',message='PLANNING_RESOURCE_UNAVAILABLE';
  end if;
  select membership.role into v_role from public.company_members membership
  where membership.company_id=v_scenario.company_id and membership.user_id=auth.uid()
    and membership.status='active' and membership.role in ('owner','admin','hr')
  limit 1;
  if v_role is null then
    raise exception using errcode='P0002',message='PLANNING_RESOURCE_UNAVAILABLE';
  end if;
  if p_expected_version<>v_scenario.version then
    raise exception using errcode='40001',message='PLANNING_VERSION_CONFLICT';
  end if;

  v_from:=v_scenario.status;
  case p_transition
    when 'submit' then v_to:='submitted'; v_event:='planning.scenario.submitted';
    when 'approve' then v_to:='approved'; v_event:='planning.scenario.approved';
    when 'reject' then v_to:='rejected'; v_event:='planning.scenario.rejected';
    when 'revise' then v_to:='draft'; v_event:='planning.scenario.revision_started';
  end case;
  if not ((v_from='draft' and v_to='submitted')
    or (v_from='submitted' and v_to in ('approved','rejected'))
    or (v_from='rejected' and v_to='draft')) then
    raise exception using errcode='55000',message='PLANNING_TRANSITION_INVALID';
  end if;

  v_now:=clock_timestamp();
  update public.organization_planning_scenarios
  set status=v_to,version=version+1,updated_at=v_now
  where id=v_scenario.id;
  insert into public.organization_planning_lifecycle_audit(
    company_id,scenario_id,actor_user_id,actor_role,event_type,from_status,
    to_status,resulting_version,reason,idempotency_key,intent_fingerprint,occurred_at
  ) values (
    v_scenario.company_id,v_scenario.id,auth.uid(),v_role,v_event,v_from,
    v_to,v_scenario.version+1,case when p_transition='reject' then v_reason end,
    p_idempotency_key,v_fingerprint,v_now
  ) returning id into v_existing.id;
  return jsonb_build_object('scenarioId',v_scenario.id,'status',v_to,
    'version',v_scenario.version+1,'updatedAt',v_now,
    'auditId',v_existing.id,'idempotent',false);
end; $$;

create function public.get_planning_scenario_lifecycle_v1(p_scenario_id uuid)
returns table(
  audit_id uuid,event_type text,actor_user_id uuid,actor_role text,
  from_status text,to_status text,resulting_version integer,reason text,
  occurred_at timestamptz
) language sql stable security definer set search_path=public,pg_temp as $$
  select audit.id,audit.event_type,audit.actor_user_id,audit.actor_role,
    audit.from_status,audit.to_status,audit.resulting_version,audit.reason,audit.occurred_at
  from public.organization_planning_lifecycle_audit audit
  join public.company_members membership
    on membership.company_id=audit.company_id and membership.user_id=auth.uid()
   and membership.status='active'
  where audit.scenario_id=p_scenario_id
  order by audit.occurred_at,audit.id;
$$;

create function public.publish_planning_scenario_v1(
  p_scenario_id uuid,
  p_expected_version integer,
  p_snapshot_id uuid,
  p_organization jsonb,
  p_change_sets jsonb
) returns jsonb language plpgsql volatile security definer
set search_path=public,pg_temp as $$
declare
  v_scenario public.organization_planning_scenarios%rowtype;
  v_existing public.organization_planning_lifecycle_audit%rowtype;
  v_role text;
  v_result record;
  v_now timestamptz;
  v_fingerprint text:=concat_ws(':',p_scenario_id,'publish',p_expected_version,p_snapshot_id,p_organization::text,p_change_sets::text);
begin
  if auth.uid() is null then raise exception using errcode='42501',message='AUTHENTICATION_REQUIRED'; end if;
  if p_snapshot_id is null or p_expected_version is null or p_expected_version<1 then
    raise exception using errcode='22023',message='PLANNING_PUBLICATION_INPUT_INVALID';
  end if;
  select * into v_existing from public.organization_planning_lifecycle_audit where idempotency_key=p_snapshot_id;
  if found then
    if v_existing.actor_user_id<>auth.uid() or v_existing.scenario_id<>p_scenario_id
      or v_existing.intent_fingerprint<>v_fingerprint then
      raise exception using errcode='23505',message='PLANNING_IDEMPOTENCY_CONFLICT';
    end if;
    select * into v_scenario from public.organization_planning_scenarios
    where id=p_scenario_id and company_id=v_existing.company_id;
    return jsonb_build_object('scenarioId',v_scenario.id,'status',v_scenario.status,
      'version',v_scenario.version,'snapshotId',p_snapshot_id,
      'auditId',v_existing.id,'idempotent',true);
  end if;
  select * into v_scenario from public.organization_planning_scenarios where id=p_scenario_id;
  if not found then raise exception using errcode='P0002',message='PLANNING_RESOURCE_UNAVAILABLE'; end if;
  select membership.role into v_role from public.company_members membership
  where membership.company_id=v_scenario.company_id and membership.user_id=auth.uid()
    and membership.status='active' and membership.role in ('owner','admin','hr') limit 1;
  if v_role is null then raise exception using errcode='P0002',message='PLANNING_RESOURCE_UNAVAILABLE'; end if;
  v_now:=clock_timestamp();
  select * into v_result from public.publish_planning_scenario(
    v_scenario.company_id,p_scenario_id,p_expected_version,p_snapshot_id,v_now,
    p_organization,p_change_sets);
  insert into public.organization_planning_lifecycle_audit(
    company_id,scenario_id,actor_user_id,actor_role,event_type,from_status,
    to_status,resulting_version,idempotency_key,intent_fingerprint,occurred_at
  ) values (
    v_scenario.company_id,p_scenario_id,auth.uid(),v_role,'planning.scenario.published',
    'approved','published',v_result.scenario_version,p_snapshot_id,v_fingerprint,v_now
  ) returning id into v_existing.id;
  return jsonb_build_object('scenarioId',v_result.scenario_id,'status',v_result.scenario_status,
    'version',v_result.scenario_version,'snapshotId',v_result.snapshot_id,
    'snapshotVersion',v_result.snapshot_version,'snapshotOrganization',v_result.snapshot_organization,
    'auditId',v_existing.id,'idempotent',false);
end; $$;

-- Old invoker RPCs are internal compatibility surfaces. They no longer expose
-- unusable or over-broad EXECUTE grants; trusted v1 boundaries are explicit.
revoke all on function public.bootstrap_planning_workspace(uuid,uuid,uuid,timestamptz,jsonb),
  public.publish_planning_scenario(uuid,uuid,integer,uuid,timestamptz,jsonb,jsonb),
  public.delete_planning_scenario(uuid,uuid,integer),
  public.protect_planning_lifecycle_audit_v1()
from public,anon,authenticated,service_role;

revoke all on function public.transition_planning_scenario_v1(uuid,text,integer,uuid,text),
  public.get_planning_scenario_lifecycle_v1(uuid),
  public.publish_planning_scenario_v1(uuid,integer,uuid,jsonb,jsonb)
from public,anon,authenticated,service_role;
grant execute on function public.transition_planning_scenario_v1(uuid,text,integer,uuid,text),
  public.get_planning_scenario_lifecycle_v1(uuid),
  public.publish_planning_scenario_v1(uuid,integer,uuid,jsonb,jsonb)
to authenticated;

notify pgrst,'reload schema';
