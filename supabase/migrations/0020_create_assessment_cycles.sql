create table if not exists public.assessment_cycles (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  name text not null,

  description text,

  assessment_type text not null default 'performance',

  status text not null default 'draft',

  start_date date not null,

  end_date date not null,

  close_date date,

  allow_self_assessment boolean not null default true,

  allow_manager_assessment boolean not null default true,

  allow_peer_assessment boolean not null default false,

  allow_direct_report_assessment boolean not null default false,

  anonymous boolean not null default false,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  deleted_at timestamptz,

  constraint assessment_cycles_type_check
    check (
      assessment_type in (
        'performance',
        'competency',
        'experience',
        'probation',
        '360',
        'custom'
      )
    ),

  constraint assessment_cycles_status_check
    check (
      status in (
        'draft',
        'scheduled',
        'active',
        'completed',
        'cancelled'
      )
    ),

  constraint assessment_cycles_dates_check
    check (
      end_date >= start_date
    ),

  constraint assessment_cycles_close_date_check
    check (
      close_date is null
      or close_date >= end_date
    )
);

create index if not exists assessment_cycles_company_id_idx
  on public.assessment_cycles(company_id);

create index if not exists assessment_cycles_status_idx
  on public.assessment_cycles(status);

create index if not exists assessment_cycles_type_idx
  on public.assessment_cycles(assessment_type);

create index if not exists assessment_cycles_start_date_idx
  on public.assessment_cycles(start_date);

alter table public.assessments
  add column if not exists assessment_cycle_id uuid
  references public.assessment_cycles(id)
  on delete set null;

create index if not exists assessments_assessment_cycle_id_idx
  on public.assessments(assessment_cycle_id);