alter table public.assessment_answers
  add column if not exists company_id uuid
  references public.companies(id)
  on delete cascade;

alter table public.assessment_answers
  add column if not exists assessment_response_id uuid
  references public.assessment_responses(id)
  on delete cascade;

alter table public.assessment_answers
  add column if not exists assessment_question_id uuid
  references public.assessment_questions(id)
  on delete cascade;

alter table public.assessment_answers
  add column if not exists answer_text text;

alter table public.assessment_answers
  add column if not exists answer_number numeric;

alter table public.assessment_answers
  add column if not exists answer_boolean boolean;

alter table public.assessment_answers
  add column if not exists updated_at timestamptz
  not null
  default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assessment_responses_status_check'
  ) then
    alter table public.assessment_responses
      add constraint assessment_responses_status_check
      check (
        status in (
          'draft',
          'in_progress',
          'submitted',
          'completed',
          'cancelled'
        )
      );
  end if;
end $$;

create unique index if not exists
assessment_answers_response_question_idx
on public.assessment_answers(
  assessment_response_id,
  assessment_question_id
)
where assessment_response_id is not null
  and assessment_question_id is not null;

create index if not exists
assessment_answers_company_idx
on public.assessment_answers(company_id);

create index if not exists
assessment_answers_question_idx
on public.assessment_answers(assessment_question_id);

alter table public.assessment_responses
  enable row level security;

alter table public.assessment_answers
  enable row level security;

create policy "members can read assessment responses"
on public.assessment_responses
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr create assessment responses"
on public.assessment_responses
for insert
with check (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

create policy "members update assessment responses"
on public.assessment_responses
for update
using (
  public.is_company_member(company_id)
)
with check (
  public.is_company_member(company_id)
);

create policy "members can read assessment answers"
on public.assessment_answers
for select
using (
  company_id is not null
  and public.is_company_member(company_id)
);

create policy "members create assessment answers"
on public.assessment_answers
for insert
with check (
  company_id is not null
  and public.is_company_member(company_id)
);

create policy "members update assessment answers"
on public.assessment_answers
for update
using (
  company_id is not null
  and public.is_company_member(company_id)
)
with check (
  company_id is not null
  and public.is_company_member(company_id)
);

notify pgrst, 'reload schema';
