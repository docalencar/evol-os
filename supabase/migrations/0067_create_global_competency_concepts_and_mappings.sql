-- PD-018 / ADR-0013 — Global Concepts & Tenant Mappings (PR 3B)

do $$
begin
  if exists (
    select 1 from public.development_template_goals g
    join public.development_templates t on t.id = g.template_id
    left join public.competencies c on c.id = g.competency_id
    where (t.scope = 'global' and g.competency_id is not null)
       or (t.scope = 'global')
       or (t.scope = 'company' and (t.company_id is null or g.competency_id is null))
       or (t.scope = 'company' and (c.id is null or c.company_id <> t.company_id))
  ) then
    raise exception 'GLOBAL_COMPETENCY_PREFLIGHT_AMBIGUOUS_TEMPLATE_GOAL';
  end if;
end
$$;

create table public.platform_global_authorities (
  user_id uuid primary key references auth.users(id) on delete restrict,
  status text not null check (status in ('active', 'revoked')),
  bootstrapped_by uuid references auth.users(id) on delete restrict,
  reason text not null check (reason ~ '^[a-z][a-z0-9_]{2,79}$'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  check ((status = 'active' and revoked_at is null) or (status = 'revoked' and revoked_at is not null))
);

create table public.platform_global_capabilities (
  capability text primary key,
  version integer not null default 1 check (version > 0),
  description text not null,
  active boolean not null default true
);

insert into public.platform_global_capabilities (capability, description) values
  ('global-competency:read', 'Read the global competency catalog'),
  ('global-competency:edit-draft', 'Create and edit draft concepts and versions'),
  ('global-competency:publish', 'Publish global competency versions'),
  ('global-competency:deprecate', 'Deprecate concepts and versions'),
  ('global-competency:manage-alias', 'Manage aliases for draft versions'),
  ('development-template:publish-global', 'Publish global development templates'),
  ('platform-curator:manage', 'Grant and revoke global curator delegations');

create table public.platform_global_delegations (
  id uuid primary key default gen_random_uuid(),
  grantor_user_id uuid not null references auth.users(id) on delete restrict,
  beneficiary_user_id uuid not null references auth.users(id) on delete restrict,
  capability text not null references public.platform_global_capabilities(capability) on delete restrict,
  status text not null default 'active' check (status in ('active', 'revoked')),
  reason text not null check (reason ~ '^[a-z][a-z0-9_]{2,79}$'),
  valid_from timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (expires_at is null or expires_at > valid_from),
  check ((status = 'active' and revoked_at is null and revoked_by is null)
    or (status = 'revoked' and revoked_at is not null and revoked_by is not null))
);

create unique index platform_global_delegations_active_uidx
on public.platform_global_delegations(beneficiary_user_id, capability)
where status = 'active';
create index platform_global_delegations_beneficiary_idx
on public.platform_global_delegations(beneficiary_user_id, status, expires_at);

create table public.platform_global_authority_audit (
  id uuid primary key default gen_random_uuid(),
  human_actor_user_id uuid references auth.users(id) on delete restrict,
  technical_principal text not null,
  delegation_id uuid references public.platform_global_delegations(id) on delete restrict,
  capability text not null,
  operation text not null,
  target_type text not null,
  target_id uuid,
  reason text not null,
  correlation_id uuid not null default gen_random_uuid(),
  decision text not null check (decision in ('allowed', 'denied')),
  previous_state jsonb,
  next_state jsonb,
  occurred_at timestamptz not null default now()
);

create index platform_global_authority_audit_actor_idx
on public.platform_global_authority_audit(human_actor_user_id, occurred_at desc);

create table public.global_competency_concepts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{2,79}$'),
  status text not null default 'draft' check (status in ('draft', 'published', 'deprecated')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  deprecated_at timestamptz
);

create table public.global_competency_concept_versions (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.global_competency_concepts(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  name text not null check (btrim(name) <> ''),
  definition text not null check (btrim(definition) <> ''),
  category text not null check (btrim(category) <> ''),
  status text not null default 'draft' check (status in ('draft', 'published', 'deprecated')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete restrict,
  published_at timestamptz,
  deprecated_by uuid references auth.users(id) on delete restrict,
  deprecated_at timestamptz,
  unique (concept_id, version_number),
  check ((status = 'draft' and published_at is null and published_by is null)
    or (status in ('published', 'deprecated') and published_at is not null and published_by is not null))
);

create index global_competency_versions_catalog_idx
on public.global_competency_concept_versions(status, concept_id, version_number desc);

create table public.global_competency_aliases (
  id uuid primary key default gen_random_uuid(),
  concept_version_id uuid not null references public.global_competency_concept_versions(id) on delete restrict,
  alias text not null check (btrim(alias) <> ''),
  normalized_alias text generated always as (lower(btrim(alias))) stored,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  deprecated_at timestamptz
);

create unique index global_competency_aliases_active_uidx
on public.global_competency_aliases(normalized_alias)
where deprecated_at is null;
create index global_competency_aliases_version_idx
on public.global_competency_aliases(concept_version_id);

create or replace function public.protect_global_competency_alias_version()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_version_id uuid; v_status text;
begin
  v_version_id := case when tg_op='DELETE' then old.concept_version_id else new.concept_version_id end;
  select status into v_status from public.global_competency_concept_versions where id=v_version_id;
  if v_status is distinct from 'draft' then raise exception using errcode='55000',message='GLOBAL_COMPETENCY_ALIAS_VERSION_IMMUTABLE'; end if;
  return case when tg_op='DELETE' then old else new end;
end; $$;
create trigger protect_global_competency_alias_version_trigger
before insert or update or delete on public.global_competency_aliases
for each row execute function public.protect_global_competency_alias_version();

create table public.global_competency_publication_audit (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid not null references public.global_competency_concepts(id) on delete restrict,
  concept_version_id uuid not null references public.global_competency_concept_versions(id) on delete restrict,
  human_actor_user_id uuid not null references auth.users(id) on delete restrict,
  technical_principal text not null,
  delegation_id uuid not null references public.platform_global_delegations(id) on delete restrict,
  operation text not null check (operation in ('publish', 'deprecate')),
  reason text not null,
  occurred_at timestamptz not null default now()
);

create table public.tenant_competency_mappings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  concept_version_id uuid not null references public.global_competency_concept_versions(id) on delete restrict,
  competency_id uuid not null,
  status text not null default 'proposed' check (status in ('proposed', 'confirmed', 'rejected', 'inactive')),
  proposed_by uuid not null references auth.users(id) on delete restrict,
  confirmed_by uuid references auth.users(id) on delete restrict,
  confirmed_at timestamptz,
  deactivated_by uuid references auth.users(id) on delete restrict,
  deactivated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, company_id),
  foreign key (competency_id, company_id) references public.competencies(id, company_id) on delete restrict,
  check ((status = 'confirmed' and confirmed_by is not null and confirmed_at is not null)
    or status <> 'confirmed'),
  check ((status = 'inactive' and deactivated_by is not null and deactivated_at is not null)
    or status <> 'inactive')
);

create unique index tenant_competency_mappings_confirmed_uidx
on public.tenant_competency_mappings(company_id, concept_version_id)
where status = 'confirmed';
create index tenant_competency_mappings_company_idx
on public.tenant_competency_mappings(company_id, status, concept_version_id);
create index tenant_competency_mappings_competency_idx
on public.tenant_competency_mappings(competency_id, company_id);

create table public.tenant_competency_mapping_audit (
  id uuid primary key default gen_random_uuid(),
  mapping_id uuid not null,
  company_id uuid not null,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  operation text not null check (operation in ('propose', 'confirm', 'reject', 'deactivate')),
  previous_status text,
  next_status text not null,
  reason text not null,
  occurred_at timestamptz not null default now(),
  foreign key (mapping_id, company_id)
    references public.tenant_competency_mappings(id, company_id) on delete restrict
);

create index tenant_competency_mapping_audit_mapping_idx
on public.tenant_competency_mapping_audit(mapping_id, company_id, occurred_at desc);

alter table public.development_templates
  add constraint development_templates_id_company_id_key unique (id, company_id);

alter table public.development_template_goals
  add column company_id uuid,
  add column global_concept_version_id uuid;

update public.development_template_goals g
set company_id = t.company_id
from public.development_templates t
where t.id = g.template_id;

alter table public.development_template_goals
  add constraint development_template_goals_company_fkey
    foreign key (company_id) references public.companies(id) on delete cascade not valid,
  add constraint development_template_goals_template_company_fkey
    foreign key (template_id, company_id)
    references public.development_templates(id, company_id) on delete cascade not valid,
  add constraint development_template_goals_competency_company_fkey
    foreign key (competency_id, company_id)
    references public.competencies(id, company_id) on delete set null not valid,
  add constraint development_template_goals_global_version_fkey
    foreign key (global_concept_version_id)
    references public.global_competency_concept_versions(id) on delete restrict not valid,
  add constraint development_template_goals_reference_check
    check (
      (company_id is null and competency_id is null and global_concept_version_id is not null)
      or (company_id is not null and competency_id is not null and global_concept_version_id is null)
    ) not valid;

alter table public.development_template_goals
  validate constraint development_template_goals_company_fkey,
  validate constraint development_template_goals_template_company_fkey,
  validate constraint development_template_goals_competency_company_fkey,
  validate constraint development_template_goals_global_version_fkey,
  validate constraint development_template_goals_reference_check;

alter table public.development_template_goals
  drop constraint development_template_goals_competency_id_fkey;

create index development_template_goals_template_company_idx
on public.development_template_goals(template_id, company_id);
create index development_template_goals_global_version_idx
on public.development_template_goals(global_concept_version_id);

create or replace function public.validate_development_template_goal_reference()
returns trigger language plpgsql set search_path=public,pg_temp as $$
declare v_template public.development_templates%rowtype; v_version_status text;
begin
  select * into strict v_template from public.development_templates where id=new.template_id;
  if v_template.scope='company' and (new.company_id is distinct from v_template.company_id or new.global_concept_version_id is not null) then
    raise exception 'COMPANY_TEMPLATE_GOAL_REFERENCE_INVALID';
  end if;
  if v_template.scope='global' then
    if new.company_id is not null or new.competency_id is not null then raise exception 'GLOBAL_TEMPLATE_GOAL_REFERENCE_INVALID'; end if;
    select status into v_version_status from public.global_competency_concept_versions where id=new.global_concept_version_id;
    if v_version_status is distinct from 'published' then raise exception 'GLOBAL_TEMPLATE_REQUIRES_PUBLISHED_CONCEPT_VERSION'; end if;
  end if;
  return new;
end; $$;
create trigger validate_development_template_goal_reference_trigger
before insert or update on public.development_template_goals
for each row execute function public.validate_development_template_goal_reference();

create or replace function public.protect_global_competency_version()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  if old.status = 'published'
    and new.status = 'deprecated'
    and new.id = old.id and new.concept_id = old.concept_id
    and new.version_number = old.version_number and new.name = old.name
    and new.definition = old.definition and new.category = old.category
    and new.created_by = old.created_by and new.created_at = old.created_at
    and new.published_by = old.published_by and new.published_at = old.published_at
  then
    return new;
  end if;
  if old.status in ('published', 'deprecated') then
    raise exception using errcode = '55000', message = 'GLOBAL_COMPETENCY_VERSION_IMMUTABLE';
  end if;
  return new;
end
$$;
create trigger protect_published_global_competency_version
before update or delete on public.global_competency_concept_versions
for each row execute function public.protect_global_competency_version();

create or replace function public.protect_append_only_global_audit()
returns trigger language plpgsql set search_path = public, pg_temp as $$
begin
  raise exception using errcode = '55000', message = 'GLOBAL_AUDIT_APPEND_ONLY';
end
$$;
create trigger protect_platform_global_authority_audit
before update or delete on public.platform_global_authority_audit
for each row execute function public.protect_append_only_global_audit();
create trigger protect_global_publication_audit
before update or delete on public.global_competency_publication_audit
for each row execute function public.protect_append_only_global_audit();
create trigger protect_tenant_mapping_audit
before update or delete on public.tenant_competency_mapping_audit
for each row execute function public.protect_append_only_global_audit();

alter table public.platform_global_authorities enable row level security;
alter table public.platform_global_capabilities enable row level security;
alter table public.platform_global_delegations enable row level security;
alter table public.platform_global_authority_audit enable row level security;
alter table public.global_competency_concepts enable row level security;
alter table public.global_competency_concept_versions enable row level security;
alter table public.global_competency_aliases enable row level security;
alter table public.global_competency_publication_audit enable row level security;
alter table public.tenant_competency_mappings enable row level security;
alter table public.tenant_competency_mapping_audit enable row level security;

create policy "read published global competency concepts"
on public.global_competency_concepts for select to authenticated
using (status = 'published');
create policy "read published global competency versions"
on public.global_competency_concept_versions for select to authenticated
using (status = 'published');
create policy "read aliases of published global competencies"
on public.global_competency_aliases for select to authenticated
using (deprecated_at is null and exists (
  select 1 from public.global_competency_concept_versions v
  where v.id = concept_version_id and v.status = 'published'
));

create policy "administrators read tenant competency mappings"
on public.tenant_competency_mappings for select to authenticated
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']));
create policy "administrators manage tenant competency mappings"
on public.tenant_competency_mappings for all to authenticated
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']))
with check (public.has_company_role(company_id, array['owner', 'admin', 'hr']));
create policy "administrators read tenant competency mapping audit"
on public.tenant_competency_mapping_audit for select to authenticated
using (public.has_company_role(company_id, array['owner', 'admin', 'hr']));

revoke all on public.platform_global_authorities,
  public.platform_global_capabilities,
  public.platform_global_delegations,
  public.platform_global_authority_audit,
  public.global_competency_concepts,
  public.global_competency_concept_versions,
  public.global_competency_aliases,
  public.global_competency_publication_audit
from authenticated;

grant select on public.global_competency_concepts,
  public.global_competency_concept_versions,
  public.global_competency_aliases to authenticated;
grant select on public.tenant_competency_mappings to authenticated;
grant select on public.tenant_competency_mapping_audit to authenticated;

create or replace function public.has_platform_global_capability(
  p_user_id uuid, p_capability text
) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.platform_global_authorities a
    join public.platform_global_delegations d on d.beneficiary_user_id = a.user_id
    where a.user_id = p_user_id and a.status = 'active'
      and d.capability = p_capability and d.status = 'active'
      and d.valid_from <= now() and (d.expires_at is null or d.expires_at > now())
  );
$$;

create or replace function public.bootstrap_platform_global_authority(
  p_human_actor_user_id uuid, p_reason text
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_delegation_id uuid; v_capability text;
begin
  if auth.role() <> 'service_role' then raise exception 'TRUSTED_EXECUTOR_REQUIRED'; end if;
  if exists (select 1 from public.platform_global_authorities) then raise exception 'GLOBAL_AUTHORITY_ALREADY_BOOTSTRAPPED'; end if;
  insert into public.platform_global_authorities(user_id,status,bootstrapped_by,reason)
  values(p_human_actor_user_id,'active',p_human_actor_user_id,p_reason);
  for v_capability in select capability from public.platform_global_capabilities where active loop
    insert into public.platform_global_delegations(grantor_user_id,beneficiary_user_id,capability,reason)
    values(p_human_actor_user_id,p_human_actor_user_id,v_capability,p_reason) returning id into v_delegation_id;
    insert into public.platform_global_authority_audit(human_actor_user_id,technical_principal,delegation_id,capability,operation,target_type,target_id,reason,decision,next_state)
    values(p_human_actor_user_id,'service_role',v_delegation_id,'platform-curator:manage','bootstrap','global_delegation',v_delegation_id,p_reason,'allowed',jsonb_build_object('capability',v_capability));
  end loop;
  return p_human_actor_user_id;
end; $$;

create or replace function public.manage_platform_global_delegation(
  p_actor_user_id uuid, p_beneficiary_user_id uuid, p_capability text,
  p_operation text, p_reason text, p_expires_at timestamptz default null
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_actor_delegation uuid; v_target public.platform_global_delegations%rowtype;
begin
  if auth.role() <> 'service_role' then raise exception 'TRUSTED_EXECUTOR_REQUIRED'; end if;
  select id into v_actor_delegation from public.platform_global_delegations
  where beneficiary_user_id=p_actor_user_id and capability='platform-curator:manage'
    and status='active' and valid_from<=now() and (expires_at is null or expires_at>now());
  if v_actor_delegation is null then raise exception 'GLOBAL_CAPABILITY_REQUIRED'; end if;
  if p_operation='grant' then
    insert into public.platform_global_authorities(user_id,status,bootstrapped_by,reason)
      values(p_beneficiary_user_id,'active',p_actor_user_id,p_reason)
      on conflict(user_id) do update set status='active',revoked_at=null;
    insert into public.platform_global_delegations(grantor_user_id,beneficiary_user_id,capability,reason,expires_at)
      values(p_actor_user_id,p_beneficiary_user_id,p_capability,p_reason,p_expires_at) returning * into v_target;
  elsif p_operation='revoke' then
    update public.platform_global_delegations set status='revoked',revoked_at=now(),revoked_by=p_actor_user_id
      where beneficiary_user_id=p_beneficiary_user_id and capability=p_capability and status='active'
      returning * into v_target;
  else raise exception 'GLOBAL_DELEGATION_OPERATION_INVALID'; end if;
  if v_target.id is null then raise exception 'GLOBAL_DELEGATION_NOT_FOUND'; end if;
  insert into public.platform_global_authority_audit(human_actor_user_id,technical_principal,delegation_id,capability,operation,target_type,target_id,reason,decision,next_state)
  values(p_actor_user_id,'service_role',v_actor_delegation,'platform-curator:manage',p_operation,'global_delegation',v_target.id,p_reason,'allowed',to_jsonb(v_target));
  return v_target.id;
end; $$;

create or replace function public.save_tenant_competency_mapping(
  p_company_id uuid, p_concept_version_id uuid, p_competency_id uuid,
  p_operation text, p_mapping_id uuid default null, p_reason text default 'mapping_update'
) returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid; v_previous text; v_next text;
begin
  if auth.uid() is null or not public.has_company_role(p_company_id,array['owner','admin','hr']) then raise exception 'TENANT_MAPPING_FORBIDDEN'; end if;
  if p_operation='propose' then
    insert into public.tenant_competency_mappings(company_id,concept_version_id,competency_id,proposed_by)
    values(p_company_id,p_concept_version_id,p_competency_id,auth.uid()) returning id,status into v_id,v_next;
  else
    select status into v_previous from public.tenant_competency_mappings where id=p_mapping_id and company_id=p_company_id for update;
    if v_previous is null then raise exception 'TENANT_MAPPING_NOT_FOUND'; end if;
    v_next := case p_operation when 'confirm' then 'confirmed' when 'reject' then 'rejected' when 'deactivate' then 'inactive' else null end;
    if v_next is null then raise exception 'TENANT_MAPPING_OPERATION_INVALID'; end if;
    update public.tenant_competency_mappings set status=v_next,updated_at=now(),
      confirmed_by=case when v_next='confirmed' then auth.uid() else confirmed_by end,
      confirmed_at=case when v_next='confirmed' then now() else confirmed_at end,
      deactivated_by=case when v_next='inactive' then auth.uid() else deactivated_by end,
      deactivated_at=case when v_next='inactive' then now() else deactivated_at end
      where id=p_mapping_id and company_id=p_company_id returning id into v_id;
  end if;
  insert into public.tenant_competency_mapping_audit(mapping_id,company_id,actor_user_id,operation,previous_status,next_status,reason)
  values(v_id,p_company_id,auth.uid(),p_operation,v_previous,v_next,p_reason);
  return v_id;
end; $$;

revoke all on function public.has_platform_global_capability(uuid,text), public.bootstrap_platform_global_authority(uuid,text), public.manage_platform_global_delegation(uuid,uuid,text,text,text,timestamptz), public.save_tenant_competency_mapping(uuid,uuid,uuid,text,uuid,text) from public;
grant execute on function public.bootstrap_platform_global_authority(uuid,text), public.manage_platform_global_delegation(uuid,uuid,text,text,text,timestamptz) to service_role;
grant execute on function public.save_tenant_competency_mapping(uuid,uuid,uuid,text,uuid,text) to authenticated;

create or replace function public.manage_global_competency_catalog(
  p_actor_user_id uuid, p_operation text, p_payload jsonb, p_reason text
) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_capability text; v_delegation uuid; v_id uuid; v_concept_id uuid; v_previous jsonb; v_next jsonb;
begin
  if auth.role()<>'service_role' then raise exception 'TRUSTED_EXECUTOR_REQUIRED'; end if;
  v_capability := case
    when p_operation in ('create_concept','create_version') then 'global-competency:edit-draft'
    when p_operation='add_alias' then 'global-competency:manage-alias'
    when p_operation='publish_version' then 'global-competency:publish'
    when p_operation='deprecate_version' then 'global-competency:deprecate' end;
  if v_capability is null then raise exception 'GLOBAL_CATALOG_OPERATION_INVALID'; end if;
  select id into v_delegation from public.platform_global_delegations
  where beneficiary_user_id=p_actor_user_id and capability=v_capability and status='active'
    and valid_from<=now() and (expires_at is null or expires_at>now());
  if v_delegation is null then raise exception 'GLOBAL_CAPABILITY_REQUIRED'; end if;
  if p_operation='create_concept' then
    insert into public.global_competency_concepts(code,created_by)
    values(p_payload->>'code',p_actor_user_id) returning id,to_jsonb(global_competency_concepts.*) into v_id,v_next;
  elsif p_operation='create_version' then
    insert into public.global_competency_concept_versions(concept_id,version_number,name,definition,category,created_by)
    values((p_payload->>'concept_id')::uuid,(p_payload->>'version_number')::integer,p_payload->>'name',p_payload->>'definition',p_payload->>'category',p_actor_user_id)
    returning id,concept_id,to_jsonb(global_competency_concept_versions.*) into v_id,v_concept_id,v_next;
  elsif p_operation='add_alias' then
    insert into public.global_competency_aliases(concept_version_id,alias,created_by)
    values((p_payload->>'concept_version_id')::uuid,p_payload->>'alias',p_actor_user_id)
    returning id,to_jsonb(global_competency_aliases.*) into v_id,v_next;
  else
    select to_jsonb(v.*),v.concept_id into v_previous,v_concept_id from public.global_competency_concept_versions v where v.id=(p_payload->>'concept_version_id')::uuid for update;
    if v_previous is null then raise exception 'GLOBAL_CONCEPT_VERSION_NOT_FOUND'; end if;
    if p_operation='publish_version' then
      update public.global_competency_concept_versions set status='published',published_by=p_actor_user_id,published_at=now() where id=(p_payload->>'concept_version_id')::uuid returning id,to_jsonb(global_competency_concept_versions.*) into v_id,v_next;
      update public.global_competency_concepts set status='published' where id=v_concept_id and status='draft';
    else
      update public.global_competency_concept_versions set status='deprecated',deprecated_by=p_actor_user_id,deprecated_at=now() where id=(p_payload->>'concept_version_id')::uuid returning id,to_jsonb(global_competency_concept_versions.*) into v_id,v_next;
    end if;
    insert into public.global_competency_publication_audit(concept_id,concept_version_id,human_actor_user_id,technical_principal,delegation_id,operation,reason)
    values(v_concept_id,v_id,p_actor_user_id,'service_role',v_delegation,case when p_operation='publish_version' then 'publish' else 'deprecate' end,p_reason);
  end if;
  insert into public.platform_global_authority_audit(human_actor_user_id,technical_principal,delegation_id,capability,operation,target_type,target_id,reason,decision,previous_state,next_state)
  values(p_actor_user_id,'service_role',v_delegation,v_capability,p_operation,'global_competency',v_id,p_reason,'allowed',v_previous,v_next);
  return v_id;
end; $$;

revoke all on function public.manage_global_competency_catalog(uuid,text,jsonb,text) from public;
grant execute on function public.manage_global_competency_catalog(uuid,text,jsonb,text) to service_role;
