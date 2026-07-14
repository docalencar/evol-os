create table if not exists public.assessment_sections (
    id uuid primary key default gen_random_uuid(),

    company_id uuid not null
        references public.companies(id)
        on delete cascade,

    assessment_template_id uuid not null
        references public.assessment_templates(id)
        on delete cascade,

    name text not null,

    description text,

    icon text,

    color text,

    weight numeric(5,2) not null default 1,

    display_order integer not null default 0,

    active boolean not null default true,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    deleted_at timestamptz
);

create index if not exists
idx_assessment_sections_company
on public.assessment_sections(company_id);

create index if not exists
idx_assessment_sections_template
on public.assessment_sections(assessment_template_id);

create index if not exists
idx_assessment_sections_order
on public.assessment_sections(
assessment_template_id,
display_order
);

create unique index if not exists
idx_assessment_sections_unique_name
on public.assessment_sections(
assessment_template_id,
lower(name)
)
where deleted_at is null;
