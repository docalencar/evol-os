-- =====================================================
-- PR-085A — Recruitment job openings foundation
-- =====================================================

create table if not exists public.recruitment_job_openings (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  title text not null,

  description text not null,

  department_id uuid not null
    references public.departments(id)
    on delete restrict,

  position_id uuid not null
    references public.positions(id)
    on delete restrict,

  requesting_manager_id uuid not null
    references public.people(id)
    on delete restrict,

  recruiter_id uuid
    references public.people(id)
    on delete set null,

  opening_reason text not null,

  replaced_employee_id uuid
    references public.people(id)
    on delete restrict,

  opening_justification text not null,

  positions_count integer not null default 1,

  current_headcount integer not null default 0,

  target_headcount integer not null default 0,

  work_model text not null,

  location text,

  employment_type text not null,

  salary_min numeric(14,2),

  salary_max numeric(14,2),

  status text not null default 'draft',

  priority text not null default 'medium',

  target_hire_date date,

  approver_id uuid
    references public.people(id)
    on delete restrict,

  approved_at timestamptz,

  notes text,

  estimated_monthly_cost numeric(14,2),

  is_budgeted boolean not null default false,

  created_by_user_id uuid not null
    references auth.users(id)
    on delete restrict,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  deleted_at timestamptz,

  constraint recruitment_job_openings_title_check
    check (char_length(trim(title)) > 0),

  constraint recruitment_job_openings_description_check
    check (char_length(trim(description)) > 0),

  constraint recruitment_job_openings_justification_check
    check (
      char_length(trim(opening_justification)) > 0
    ),

  constraint recruitment_job_openings_status_check
    check (
      status in (
        'draft',
        'pending_approval',
        'approved',
        'open',
        'paused',
        'closed',
        'cancelled',
        'filled'
      )
    ),

  constraint recruitment_job_openings_priority_check
    check (
      priority in (
        'low',
        'medium',
        'high',
        'urgent'
      )
    ),

  constraint recruitment_job_openings_reason_check
    check (
      opening_reason in (
        'replacement',
        'headcount_growth',
        'new_position',
        'temporary_demand',
        'internal_mobility',
        'other'
      )
    ),

  constraint recruitment_job_openings_work_model_check
    check (
      work_model in (
        'on_site',
        'hybrid',
        'remote'
      )
    ),

  constraint recruitment_job_openings_employment_type_check
    check (
      employment_type in (
        'clt',
        'pj',
        'intern',
        'apprentice',
        'temporary',
        'outsourced',
        'contractor',
        'other'
      )
    ),

  constraint recruitment_job_openings_positions_count_check
    check (positions_count > 0),

  constraint recruitment_job_openings_current_headcount_check
    check (current_headcount >= 0),

  constraint recruitment_job_openings_target_headcount_check
    check (target_headcount >= 0),

  constraint recruitment_job_openings_salary_min_check
    check (
      salary_min is null
      or salary_min >= 0
    ),

  constraint recruitment_job_openings_salary_max_check
    check (
      salary_max is null
      or salary_max >= 0
    ),

  constraint recruitment_job_openings_salary_range_check
    check (
      salary_min is null
      or salary_max is null
      or salary_max >= salary_min
    ),

  constraint recruitment_job_openings_monthly_cost_check
    check (
      estimated_monthly_cost is null
      or estimated_monthly_cost >= 0
    ),

  constraint recruitment_job_openings_replacement_check
    check (
      (
        opening_reason = 'replacement'
        and replaced_employee_id is not null
      )
      or (
        opening_reason <> 'replacement'
        and replaced_employee_id is null
      )
    ),

  constraint recruitment_job_openings_approval_actor_check
    check (
      approved_at is null
      or approver_id is not null
    ),

  constraint recruitment_job_openings_approved_status_check
    check (
      status not in (
        'approved',
        'open',
        'paused',
        'closed',
        'filled'
      )
      or (
        approved_at is not null
        and approver_id is not null
      )
    ),

  constraint recruitment_job_openings_unapproved_status_check
    check (
      status not in (
        'draft',
        'pending_approval'
      )
      or approved_at is null
    )
);

create index if not exists
  recruitment_job_openings_company_created_idx
  on public.recruitment_job_openings (
    company_id,
    created_at desc
  )
  where deleted_at is null;

create index if not exists
  recruitment_job_openings_company_status_created_idx
  on public.recruitment_job_openings (
    company_id,
    status,
    created_at desc
  )
  where deleted_at is null;

create index if not exists
  recruitment_job_openings_department_status_idx
  on public.recruitment_job_openings (
    company_id,
    department_id,
    status
  )
  where deleted_at is null;

create index if not exists
  recruitment_job_openings_position_status_idx
  on public.recruitment_job_openings (
    company_id,
    position_id,
    status
  )
  where deleted_at is null;

create index if not exists
  recruitment_job_openings_recruiter_status_idx
  on public.recruitment_job_openings (
    company_id,
    recruiter_id,
    status
  )
  where recruiter_id is not null
    and deleted_at is null;

create index if not exists
  recruitment_job_openings_requester_status_idx
  on public.recruitment_job_openings (
    company_id,
    requesting_manager_id,
    status
  )
  where deleted_at is null;

create index if not exists
  recruitment_job_openings_target_hire_date_idx
  on public.recruitment_job_openings (
    company_id,
    target_hire_date
  )
  where target_hire_date is not null
    and deleted_at is null
    and status in (
      'approved',
      'open',
      'paused'
    );

alter table public.recruitment_job_openings
  enable row level security;

create policy "members can read recruitment job openings"
on public.recruitment_job_openings
for select
using (
  public.is_company_member(company_id)
);

create policy "admins and hr create recruitment job openings"
on public.recruitment_job_openings
for insert
with check (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

create policy "admins and hr update recruitment job openings"
on public.recruitment_job_openings
for update
using (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
)
with check (
  public.has_company_role(
    company_id,
    array['owner', 'admin', 'hr']
  )
);

comment on table public.recruitment_job_openings is
  'Vagas gerenciadas pelo módulo de Recrutamento do Evol OS.';

comment on column
  public.recruitment_job_openings.estimated_monthly_cost
is
  'Custo mensal previsto da vaga em BRL.';

comment on column
  public.recruitment_job_openings.deleted_at
is
  'Data de arquivamento lógico da vaga.';

notify pgrst, 'reload schema';
