-- Evol People / Evol Performance
-- schema.sql
-- Execute no SQL Editor do Supabase

create extension if not exists "pgcrypto";

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  segment text,
  employee_range text,
  timezone text not null default 'America/Fortaleza',
  status text not null default 'active' check (status in ('active', 'inactive', 'trial')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'hr', 'manager', 'employee')),
  status text not null default 'active' check (status in ('active', 'inactive', 'invited')),
  created_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  parent_team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text,
  phone text,
  birth_date date,
  hire_date date,
  status text not null default 'active' check (status in ('active', 'inactive', 'on_leave', 'terminated')),
  manager_id uuid references public.people(id) on delete set null,
  team_id uuid references public.teams(id) on delete set null,
  position_id uuid references public.positions(id) on delete set null,
  disc_profile text check (disc_profile in ('D', 'I', 'S', 'C') or disc_profile is null),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.competencies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  description text,
  category text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  type text not null check (type in ('experience', 'monthly', 'quarterly', 'semester', 'annual', '360', 'leadership')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.assessment_templates(id) on delete cascade,
  competency_id uuid references public.competencies(id) on delete set null,
  question text not null,
  order_index integer not null default 0
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  template_id uuid references public.assessment_templates(id) on delete set null,
  employee_id uuid not null references public.people(id) on delete cascade,
  manager_id uuid references public.people(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'open', 'completed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_answers (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  score integer check (score between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(assessment_id, question_id)
);

create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  employee_id uuid not null references public.people(id) on delete cascade,
  manager_id uuid references public.people(id) on delete set null,
  assessment_id uuid references public.assessments(id) on delete set null,
  summary text,
  strengths text,
  improvements text,
  next_steps text,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  person_id uuid references public.people(id) on delete set null,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_company_members_user_id on public.company_members(user_id);
create index if not exists idx_people_company_id on public.people(company_id);
create index if not exists idx_people_manager_id on public.people(manager_id);
create index if not exists idx_people_team_id on public.people(team_id);
create index if not exists idx_assessments_company_id on public.assessments(company_id);
create index if not exists idx_assessments_employee_id on public.assessments(employee_id);
create index if not exists idx_feedbacks_employee_id on public.feedbacks(employee_id);
create index if not exists idx_events_company_id_created_at on public.events(company_id, created_at desc);
