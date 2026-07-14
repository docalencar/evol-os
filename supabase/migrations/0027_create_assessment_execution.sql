-- Cria a entidade de execução da avaliação.
-- A tabela assessment_answers já existia anteriormente e será
-- alinhada pela migration 0028_align_assessment_execution.sql.

create table if not exists public.assessment_responses (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  assessment_cycle_id uuid not null
    references public.assessment_cycles(id)
    on delete cascade,

  assessment_template_id uuid not null
    references public.assessment_templates(id)
    on delete cascade,

  employee_id uuid not null
    references public.people(id)
    on delete cascade,

  evaluator_id uuid not null
    references public.people(id)
    on delete cascade,

  status text not null default 'draft',

  started_at timestamptz,

  completed_at timestamptz,

  submitted_at timestamptz,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create index if not exists assessment_responses_employee_idx
  on public.assessment_responses(employee_id);

create index if not exists assessment_responses_evaluator_idx
  on public.assessment_responses(evaluator_id);

create index if not exists assessment_responses_cycle_idx
  on public.assessment_responses(assessment_cycle_id);

create index if not exists assessment_responses_company_idx
  on public.assessment_responses(company_id);

notify pgrst, 'reload schema';
