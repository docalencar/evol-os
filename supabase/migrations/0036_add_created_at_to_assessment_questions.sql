alter table public.assessment_questions
  add column if not exists created_at timestamptz;

update public.assessment_questions
set created_at = coalesce(
  created_at,
  updated_at,
  now()
)
where created_at is null;

alter table public.assessment_questions
  alter column created_at
  set default now();

alter table public.assessment_questions
  alter column created_at
  set not null;

notify pgrst, 'reload schema';
