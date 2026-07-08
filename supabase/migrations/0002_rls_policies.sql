-- Evol People / Evol Performance
-- rls.sql
-- Execute após schema.sql

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.teams enable row level security;
alter table public.positions enable row level security;
alter table public.people enable row level security;
alter table public.competencies enable row level security;
alter table public.assessment_templates enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_answers enable row level security;
alter table public.feedbacks enable row level security;
alter table public.development_plans enable row level security;
alter table public.development_actions enable row level security;
alter table public.events enable row level security;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
  );
$$;

create or replace function public.has_company_role(target_company_id uuid, allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.company_id = target_company_id
      and cm.user_id = auth.uid()
      and cm.status = 'active'
      and cm.role = any(allowed_roles)
  );
$$;

create or replace function public.current_person_id(target_company_id uuid)
returns uuid
language sql
security definer
set search_path = public
as $$
  select p.id
  from public.people p
  where p.company_id = target_company_id
    and p.user_id = auth.uid()
  limit 1;
$$;

-- Companies
create policy "members can read companies"
on public.companies
for select
using (public.is_company_member(id));

create policy "owners and admins can update companies"
on public.companies
for update
using (public.has_company_role(id, array['owner','admin']));

-- Company members
create policy "members can read company members"
on public.company_members
for select
using (public.is_company_member(company_id));

create policy "owners and admins manage company members"
on public.company_members
for all
using (public.has_company_role(company_id, array['owner','admin']));

-- Generic company-owned tables
create policy "members can read teams"
on public.teams for select
using (public.is_company_member(company_id));

create policy "admins and hr manage teams"
on public.teams for all
using (public.has_company_role(company_id, array['owner','admin','hr']));

create policy "members can read positions"
on public.positions for select
using (public.is_company_member(company_id));

create policy "admins and hr manage positions"
on public.positions for all
using (public.has_company_role(company_id, array['owner','admin','hr']));

create policy "members can read competencies"
on public.competencies for select
using (company_id is null or public.is_company_member(company_id));

create policy "admins and hr manage competencies"
on public.competencies for all
using (company_id is not null and public.has_company_role(company_id, array['owner','admin','hr']));

-- People
create policy "members can read people in company"
on public.people
for select
using (public.is_company_member(company_id));

create policy "admins and hr manage people"
on public.people
for all
using (public.has_company_role(company_id, array['owner','admin','hr']));

-- Assessment templates/questions
create policy "members can read assessment templates"
on public.assessment_templates for select
using (company_id is null or public.is_company_member(company_id));

create policy "admins and hr manage assessment templates"
on public.assessment_templates for all
using (company_id is not null and public.has_company_role(company_id, array['owner','admin','hr']));

create policy "members can read assessment questions"
on public.assessment_questions for select
using (
  exists (
    select 1
    from public.assessment_templates t
    where t.id = template_id
      and (t.company_id is null or public.is_company_member(t.company_id))
  )
);

create policy "admins and hr manage assessment questions"
on public.assessment_questions for all
using (
  exists (
    select 1
    from public.assessment_templates t
    where t.id = template_id
      and t.company_id is not null
      and public.has_company_role(t.company_id, array['owner','admin','hr'])
  )
);

-- Assessments
create policy "members can read assessments"
on public.assessments for select
using (
  public.has_company_role(company_id, array['owner','admin','hr'])
  or employee_id = public.current_person_id(company_id)
  or manager_id = public.current_person_id(company_id)
);

create policy "admins hr and managers create assessments"
on public.assessments for insert
with check (
  public.has_company_role(company_id, array['owner','admin','hr','manager'])
);

create policy "admins hr and related managers update assessments"
on public.assessments for update
using (
  public.has_company_role(company_id, array['owner','admin','hr'])
  or manager_id = public.current_person_id(company_id)
);

-- Answers
create policy "members can read assessment answers"
on public.assessment_answers for select
using (
  exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and (
        public.has_company_role(a.company_id, array['owner','admin','hr'])
        or a.employee_id = public.current_person_id(a.company_id)
        or a.manager_id = public.current_person_id(a.company_id)
      )
  )
);

create policy "related managers can manage assessment answers"
on public.assessment_answers for all
using (
  exists (
    select 1
    from public.assessments a
    where a.id = assessment_id
      and (
        public.has_company_role(a.company_id, array['owner','admin','hr'])
        or a.manager_id = public.current_person_id(a.company_id)
      )
  )
);

-- Feedbacks
create policy "members can read related feedbacks"
on public.feedbacks for select
using (
  public.has_company_role(company_id, array['owner','admin','hr'])
  or employee_id = public.current_person_id(company_id)
  or manager_id = public.current_person_id(company_id)
);

create policy "admins hr and managers manage feedbacks"
on public.feedbacks for all
using (
  public.has_company_role(company_id, array['owner','admin','hr'])
  or manager_id = public.current_person_id(company_id)
);

-- Development plans
create policy "members can read related development plans"
on public.development_plans for select
using (
  public.has_company_role(company_id, array['owner','admin','hr'])
  or employee_id = public.current_person_id(company_id)
);

create policy "admins hr and managers manage development plans"
on public.development_plans for all
using (
  public.has_company_role(company_id, array['owner','admin','hr','manager'])
);

create policy "members can read development actions"
on public.development_actions for select
using (
  exists (
    select 1 from public.development_plans dp
    where dp.id = plan_id
      and (
        public.has_company_role(dp.company_id, array['owner','admin','hr'])
        or dp.employee_id = public.current_person_id(dp.company_id)
      )
  )
);

create policy "admins hr and managers manage development actions"
on public.development_actions for all
using (
  exists (
    select 1 from public.development_plans dp
    where dp.id = plan_id
      and public.has_company_role(dp.company_id, array['owner','admin','hr','manager'])
  )
);

-- Events
create policy "members can read events"
on public.events for select
using (public.is_company_member(company_id));

create policy "system users can insert events"
on public.events for insert
with check (public.is_company_member(company_id));
