create table if not exists public.organization_reorganization_proposals (

  id uuid primary key default gen_random_uuid(),

  company_id uuid not null
    references public.companies(id)
    on delete cascade,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'review',
        'approved',
        'rejected',
        'applied'
      )
    ),

  title text not null,

  description text,

  created_by uuid
    references auth.users(id)
    on delete set null,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);


create table if not exists public.organization_reorganization_changes (

  id uuid primary key default gen_random_uuid(),

  proposal_id uuid not null
    references public.organization_reorganization_proposals(id)
    on delete cascade,

  type text not null
    check (
      type in (
        'create_unit',
        'update_unit',
        'remove_unit'
      )
    ),

  original_name text not null,

  proposed_name text not null,

  status text not null default 'suggested'
    check (
      status in (
        'suggested',
        'accepted',
        'modified',
        'removed'
      )
    ),

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()

);


create index if not exists organization_reorganization_proposals_company_idx
on public.organization_reorganization_proposals(company_id);


create index if not exists organization_reorganization_changes_proposal_idx
on public.organization_reorganization_changes(proposal_id);


comment on table public.organization_reorganization_proposals is
'Propostas de reorganização geradas pela inteligência organizacional e revisadas por usuários.';


comment on table public.organization_reorganization_changes is
'Alterações sugeridas ou ajustadas dentro de uma proposta de reorganização.';
