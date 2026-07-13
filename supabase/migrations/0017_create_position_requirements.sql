create table if not exists public.position_requirements (
  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  position_id uuid not null
    references public.positions(id)
    on delete cascade,

  category text not null check (
    category in (
      'education',
      'experience',
      'certification',
      'language',
      'knowledge',
      'other'
    )
  ),

  value text not null,

  required boolean not null default true,

  notes text,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now(),

  archived_at timestamptz
);

create index if not exists
position_requirements_company_idx
on public.position_requirements (
  company_id
);

create index if not exists
position_requirements_position_idx
on public.position_requirements (
  position_id
);

alter table
public.position_requirements
enable row level security;

create policy
"members can read position requirements"
on public.position_requirements
for select
using (
  exists (
    select 1
    from public.company_members cm
    where
      cm.company_id =
      position_requirements.company_id
      and cm.user_id = auth.uid()
  )
);

create policy
"admins manage position requirements"
on public.position_requirements
for all
using (
  exists (
    select 1
    from public.company_members cm
    where
      cm.company_id =
      position_requirements.company_id
      and cm.user_id = auth.uid()
      and cm.role in (
        'owner',
        'admin',
        'hr'
      )
  )
)
with check (
  exists (
    select 1
    from public.company_members cm
    where
      cm.company_id =
      position_requirements.company_id
      and cm.user_id = auth.uid()
      and cm.role in (
        'owner',
        'admin',
        'hr'
      )
  )
);
