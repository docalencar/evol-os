alter table public.assessment_questions
  add column if not exists company_id uuid
  references public.companies(id)
  on delete cascade;

alter table public.assessment_questions
  add column if not exists assessment_section_id uuid
  references public.assessment_sections(id)
  on delete cascade;

alter table public.assessment_questions
  add column if not exists code text;

alter table public.assessment_questions
  add column if not exists help_text text;

alter table public.assessment_questions
  add column if not exists question_type text
  not null
  default 'scale';

alter table public.assessment_questions
  add column if not exists scale_min integer
  not null
  default 1;

alter table public.assessment_questions
  add column if not exists scale_max integer
  not null
  default 5;

alter table public.assessment_questions
  add column if not exists weight numeric(5,2)
  not null
  default 1;

alter table public.assessment_questions
  add column if not exists required boolean
  not null
  default true;

alter table public.assessment_questions
  add column if not exists active boolean
  not null
  default true;

alter table public.assessment_questions
  add column if not exists updated_at timestamptz
  not null
  default now();

alter table public.assessment_questions
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assessment_questions_type_check'
  ) then
    alter table public.assessment_questions
      add constraint assessment_questions_type_check
      check (
        question_type in (
          'scale',
          'yes_no',
          'text',
          'number'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assessment_questions_scale_check'
  ) then
    alter table public.assessment_questions
      add constraint assessment_questions_scale_check
      check (
        scale_min >= 0
        and scale_max > scale_min
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assessment_questions_weight_check'
  ) then
    alter table public.assessment_questions
      add constraint assessment_questions_weight_check
      check (
        weight > 0
        and weight <= 100
      );
  end if;
end $$;

create index if not exists assessment_questions_section_order_idx
  on public.assessment_questions(
    assessment_section_id,
    order_index
  )
  where deleted_at is null;

create index if not exists assessment_questions_company_idx
  on public.assessment_questions(company_id);

create unique index if not exists assessment_questions_company_code_idx
  on public.assessment_questions(company_id, code)
  where code is not null
    and deleted_at is null;

alter table public.assessment_questions
  enable row level security;

drop policy if exists
  "members can read assessment questions"
  on public.assessment_questions;

drop policy if exists
  "admins and hr manage assessment questions"
  on public.assessment_questions;

create policy "members can read assessment questions"
on public.assessment_questions
for select
using (
  company_id is not null
  and public.is_company_member(company_id)
);

create policy "admins and hr create assessment questions"
on public.assessment_questions
for insert
with check (
  company_id is not null
  and public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

create policy "admins and hr update assessment questions"
on public.assessment_questions
for update
using (
  company_id is not null
  and public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
)
with check (
  company_id is not null
  and public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

create policy "admins and hr delete assessment questions"
on public.assessment_questions
for delete
using (
  company_id is not null
  and public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

notify pgrst, 'reload schema';
