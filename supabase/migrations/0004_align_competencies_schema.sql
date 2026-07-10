alter table public.competencies
add column if not exists expected_level integer not null default 3;

alter table public.competencies
add column if not exists weight integer not null default 1;

alter table public.competencies
add column if not exists updated_at timestamptz not null default now();

alter table public.competencies
alter column company_id set not null;

alter table public.competencies
alter column category set not null;

alter table public.competencies
add constraint competencies_category_check
check (category in ('behavioral', 'technical', 'leadership'));

alter table public.competencies
add constraint competencies_expected_level_check
check (expected_level between 1 and 5);

alter table public.competencies
add constraint competencies_weight_check
check (weight between 1 and 5);

create unique index if not exists competencies_company_name_active_unique
on public.competencies (company_id, lower(name))
where active = true;

create index if not exists competencies_company_id_idx
on public.competencies (company_id);

create index if not exists competencies_company_category_idx
on public.competencies (company_id, category);

