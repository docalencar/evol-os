-- D-DB1: purpose-scoped template catalog and administrative authoring boundary.

alter table public.development_template_versions
  add column revision bigint not null default 1 check (revision > 0),
  add column authoring_idempotency_key uuid,
  add column authoring_fingerprint text;

create unique index development_template_versions_authoring_idempotency_idx
on public.development_template_versions(company_id, authoring_idempotency_key)
where authoring_idempotency_key is not null;

create function public.get_published_development_template_catalog_v1(p_company_id uuid)
returns table(id uuid,template_id uuid,company_id uuid,scope text,version_number integer,name text,description text,suggested_duration_days integer)
language sql security definer set search_path = public, pg_temp stable as $$
  select v.id,v.template_id,v.company_id,v.scope,v.version_number,v.name,v.description,v.suggested_duration_days
  from public.development_template_versions v
  where v.status='published' and (v.scope='global' or v.company_id=p_company_id)
    and exists(select 1 from public.company_members m where m.company_id=p_company_id and m.user_id=auth.uid() and m.status='active')
  order by v.scope,v.name,v.version_number desc
$$;

create function public.get_development_template_authoring_v1(p_company_id uuid)
returns setof public.development_template_versions
language sql security definer set search_path = public, pg_temp stable as $$
  select v.* from public.development_template_versions v
  where v.company_id=p_company_id and v.scope='company'
    and public.development_actor_is_admin_v1(p_company_id)
  order by v.created_at desc
$$;

create function public.create_development_template_draft_v1(p_company_id uuid,p_name text,p_description text,p_duration integer,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_actor uuid:=auth.uid(); v_template uuid; v_version uuid; v_fingerprint text; v_existing record;
begin
  if not public.development_actor_is_admin_v1(p_company_id) then raise exception using errcode='42501',message='DEVELOPMENT_TEMPLATE_FORBIDDEN'; end if;
  if nullif(btrim(p_name),'') is null or char_length(btrim(p_name))>200 or p_duration is not null and p_duration<=0 or p_idempotency_key is null
  then raise exception using errcode='22023',message='DEVELOPMENT_TEMPLATE_INVALID'; end if;
  v_fingerprint:=encode(extensions.digest(jsonb_build_array(p_name,p_description,p_duration)::text,'sha256'),'hex');
  select id,authoring_fingerprint into v_existing from public.development_template_versions where company_id=p_company_id and authoring_idempotency_key=p_idempotency_key;
  if found then
    if v_existing.authoring_fingerprint<>v_fingerprint then raise exception using errcode='23505',message='DEVELOPMENT_TEMPLATE_IDEMPOTENCY_CONFLICT'; end if;
    return v_existing.id;
  end if;
  insert into public.development_templates(company_id,name,description,scope,suggested_duration_days,active,created_by,updated_at)
  values(p_company_id,btrim(p_name),nullif(btrim(p_description),''),'company',p_duration,false,v_actor,now()) returning id into v_template;
  insert into public.development_template_versions(template_id,company_id,scope,version_number,status,name,description,suggested_duration_days,created_by,authoring_idempotency_key,authoring_fingerprint)
  values(v_template,p_company_id,'company',1,'draft',btrim(p_name),nullif(btrim(p_description),''),p_duration,v_actor,p_idempotency_key,v_fingerprint) returning id into v_version;
  perform public.append_development_private_audit_v1(p_company_id,'template.draft_created',public.development_actor_person_id_v1(p_company_id),'development_template_version',v_version,null,'draft',null,p_idempotency_key,null);
  return v_version;
end; $$;

create function public.add_development_template_goal_v1(p_version_id uuid,p_competency_id uuid,p_description text,p_target integer,p_order integer)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.development_template_versions%rowtype; v_id uuid;
begin
  select * into v from public.development_template_versions where id=p_version_id for update;
  if not found or v.company_id is null or not public.development_actor_is_admin_v1(v.company_id) then raise exception using errcode='P0002',message='DEVELOPMENT_TEMPLATE_NOT_FOUND'; end if;
  if v.status<>'draft' then raise exception using errcode='23514',message='DEVELOPMENT_TEMPLATE_IMMUTABLE'; end if;
  if p_target not between 1 and 5 or p_order<0 or not exists(select 1 from public.competencies c where c.id=p_competency_id and c.company_id=v.company_id and c.active)
  then raise exception using errcode='22023',message='DEVELOPMENT_TEMPLATE_GOAL_INVALID'; end if;
  insert into public.development_template_version_goals(template_version_id,company_id,competency_id,description,suggested_target_level,order_index)
  values(v.id,v.company_id,p_competency_id,nullif(btrim(p_description),''),p_target,p_order) returning id into v_id;
  update public.development_template_versions set revision=revision+1 where id=v.id;
  perform public.append_development_private_audit_v1(v.company_id,'template.goal_created',public.development_actor_person_id_v1(v.company_id),'development_template_goal',v_id,null,'draft',null,v.id,null);
  return v_id;
end; $$;

create function public.add_development_template_action_v1(p_goal_id uuid,p_title text,p_description text,p_type text,p_due_days integer,p_order integer)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.development_template_versions%rowtype; v_id uuid;
begin
  select version.* into v from public.development_template_version_goals goal join public.development_template_versions version on version.id=goal.template_version_id where goal.id=p_goal_id for update of version;
  if not found or v.company_id is null or not public.development_actor_is_admin_v1(v.company_id) then raise exception using errcode='P0002',message='DEVELOPMENT_TEMPLATE_GOAL_NOT_FOUND'; end if;
  if v.status<>'draft' then raise exception using errcode='23514',message='DEVELOPMENT_TEMPLATE_IMMUTABLE'; end if;
  if nullif(btrim(p_title),'') is null or char_length(btrim(p_title))>200 or p_type not in ('course','book','mentoring','shadowing','project','workshop','feedback','other') or p_due_days is not null and p_due_days<=0 or p_order<0
  then raise exception using errcode='22023',message='DEVELOPMENT_TEMPLATE_ACTION_INVALID'; end if;
  insert into public.development_template_version_actions(template_version_goal_id,title,description,type,suggested_due_days,order_index)
  values(p_goal_id,btrim(p_title),nullif(btrim(p_description),''),p_type,p_due_days,p_order) returning id into v_id;
  update public.development_template_versions set revision=revision+1 where id=v.id;
  perform public.append_development_private_audit_v1(v.company_id,'template.action_created',public.development_actor_person_id_v1(v.company_id),'development_template_action',v_id,null,'draft',null,v.id,null);
  return v_id;
end; $$;

create function public.publish_development_template_version_v1(p_version_id uuid,p_expected_revision bigint)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.development_template_versions%rowtype;
begin
  select * into v from public.development_template_versions where id=p_version_id for update;
  if not found or v.company_id is null or not public.development_actor_is_admin_v1(v.company_id) then raise exception using errcode='P0002',message='DEVELOPMENT_TEMPLATE_NOT_FOUND'; end if;
  if v.status<>'draft' or v.revision<>p_expected_revision then raise exception using errcode='23514',message='DEVELOPMENT_TEMPLATE_TRANSITION_INVALID'; end if;
  if not exists(select 1 from public.development_template_version_goals g where g.template_version_id=v.id)
    or exists(select 1 from public.development_template_version_goals g where g.template_version_id=v.id and not exists(select 1 from public.development_template_version_actions a where a.template_version_goal_id=g.id))
  then raise exception using errcode='23514',message='DEVELOPMENT_TEMPLATE_CONTENT_INCOMPLETE'; end if;
  update public.development_template_versions set status='published',published_by=auth.uid(),published_at=clock_timestamp(),revision=revision+1 where id=v.id;
  update public.development_templates set active=true,updated_at=clock_timestamp() where id=v.template_id;
  perform public.append_development_private_audit_v1(v.company_id,'template.published',public.development_actor_person_id_v1(v.company_id),'development_template_version',v.id,'draft','published',null,null,null);
  return v.id;
end; $$;

create function public.obsolete_development_template_version_v1(p_version_id uuid)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v public.development_template_versions%rowtype;
begin
  select * into v from public.development_template_versions where id=p_version_id for update;
  if not found or v.company_id is null or not public.development_actor_is_admin_v1(v.company_id) then raise exception using errcode='P0002',message='DEVELOPMENT_TEMPLATE_NOT_FOUND'; end if;
  if v.status<>'published' then raise exception using errcode='23514',message='DEVELOPMENT_TEMPLATE_TRANSITION_INVALID'; end if;
  update public.development_template_versions set status='obsolete',obsoleted_by=auth.uid(),obsoleted_at=clock_timestamp(),revision=revision+1 where id=v.id;
  update public.development_templates set active=false,updated_at=clock_timestamp() where id=v.template_id;
  perform public.append_development_private_audit_v1(v.company_id,'template.obsoleted',public.development_actor_person_id_v1(v.company_id),'development_template_version',v.id,'published','obsolete',null,null,null);
  return v.id;
end; $$;

revoke all on function public.get_published_development_template_catalog_v1(uuid),public.get_development_template_authoring_v1(uuid),public.create_development_template_draft_v1(uuid,text,text,integer,uuid),public.add_development_template_goal_v1(uuid,uuid,text,integer,integer),public.add_development_template_action_v1(uuid,text,text,text,integer,integer),public.publish_development_template_version_v1(uuid,bigint),public.obsolete_development_template_version_v1(uuid) from public,anon,authenticated,service_role;
grant execute on function public.get_published_development_template_catalog_v1(uuid),public.get_development_template_authoring_v1(uuid),public.create_development_template_draft_v1(uuid,text,text,integer,uuid),public.add_development_template_goal_v1(uuid,uuid,text,integer,integer),public.add_development_template_action_v1(uuid,text,text,text,integer,integer),public.publish_development_template_version_v1(uuid,bigint),public.obsolete_development_template_version_v1(uuid) to authenticated;

revoke all on table public.development_templates,public.development_template_goals,public.development_template_actions,public.development_template_versions,public.development_template_version_goals,public.development_template_version_actions from public,anon,authenticated;

notify pgrst, 'reload schema';
