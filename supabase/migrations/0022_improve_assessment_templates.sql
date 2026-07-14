alter table public.assessment_templates
  add column if not exists description text;

alter table public.assessment_templates
  add column if not exists instructions text;

alter table public.assessment_templates
  add column if not exists status text
  not null
  default 'draft';

alter table public.assessment_templates
  add column if not exists updated_at timestamptz
  not null
  default now();

alter table public.assessment_templates
  add column if not exists deleted_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assessment_templates_status_check'
  ) then
    alter table public.assessment_templates
      add constraint assessment_templates_status_check
      check (
        status in (
          'draft',
          'active',
          'archived'
        )
      );
  end if;
end $$;

create index if not exists assessment_templates_company_status_idx
  on public.assessment_templates(company_id, status);

create index if not exists assessment_templates_deleted_at_idx
  on public.assessment_templates(deleted_at);
  