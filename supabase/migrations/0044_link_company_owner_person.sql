create or replace function public.create_company_with_owner(
  p_name text,
  p_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_company_id uuid;
  v_user_email text;
  v_user_full_name text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if nullif(trim(p_name), '') is null then
    raise exception 'COMPANY_NAME_REQUIRED';
  end if;

  if nullif(trim(p_slug), '') is null then
    raise exception 'COMPANY_SLUG_REQUIRED';
  end if;

  if exists (
    select 1
    from public.company_members
    where user_id = v_user_id
      and status = 'active'
  ) then
    raise exception 'USER_ALREADY_HAS_COMPANY';
  end if;

  select
    users.email,
    nullif(
      trim(
        users.raw_user_meta_data ->> 'full_name'
      ),
      ''
    )
  into
    v_user_email,
    v_user_full_name
  from auth.users as users
  where users.id = v_user_id;

  if v_user_full_name is null then
    v_user_full_name := coalesce(
      nullif(
        trim(
          split_part(
            coalesce(v_user_email, ''),
            '@',
            1
          )
        ),
        ''
      ),
      'Administrador'
    );
  end if;

  insert into public.companies (
    name,
    slug,
    status
  )
  values (
    trim(p_name),
    lower(trim(p_slug)),
    'active'
  )
  returning id into v_company_id;

  insert into public.company_members (
    company_id,
    user_id,
    role,
    status
  )
  values (
    v_company_id,
    v_user_id,
    'owner',
    'active'
  );

  insert into public.people (
    company_id,
    user_id,
    full_name,
    email,
    status
  )
  values (
    v_company_id,
    v_user_id,
    v_user_full_name,
    v_user_email,
    'active'
  );

  return v_company_id;
end;
$$;

revoke all
on function public.create_company_with_owner(text, text)
from public;

grant execute
on function public.create_company_with_owner(text, text)
to authenticated;
