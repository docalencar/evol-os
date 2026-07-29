alter table public.departments
  enable row level security;

drop policy if exists "members can read departments"
  on public.departments;

create policy "members can read departments"
on public.departments
for select
using (
  public.is_company_member(company_id)
);

drop policy if exists "admins and hr manage departments"
  on public.departments;

create policy "admins and hr manage departments"
on public.departments
for all
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
)
with check (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

notify pgrst, 'reload schema';
