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

create table if not exists public.assessment_answers (
    id uuid primary key default gen_random_uuid(),

    company_id uuid not null
        references public.companies(id)
        on delete cascade,

    assessment_response_id uuid not null
        references public.assessment_responses(id)
        on delete cascade,

    assessment_question_id uuid not null
        references public.assessment_questions(id)
        on delete cascade,

    answer_text text,

    answer_number numeric,

    answer_boolean boolean,

    score numeric,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    unique (
        assessment_response_id,
        assessment_question_id
    )
);

create index if not exists
assessment_answers_response_idx
on public.assessment_answers(
    assessment_response_id
);

create index if not exists
assessment_responses_employee_idx
on public.assessment_responses(
    employee_id
);

create index if not exists
assessment_responses_cycle_idx
on public.assessment_responses(
    assessment_cycle_id
);

notify pgrst, 'reload schema';
