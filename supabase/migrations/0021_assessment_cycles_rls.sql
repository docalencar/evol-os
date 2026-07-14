alter table public.assessment_cycles
  enable row level security;

create policy "members can read assessment cycles"
on public.assessment_cycles
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr create assessment cycles"
on public.assessment_cycles
for insert
with check (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

create policy "admins and hr update assessment cycles"
on public.assessment_cycles
for update
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

create policy "admins and hr delete assessment cycles"
on public.assessment_cycles
for delete
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);
