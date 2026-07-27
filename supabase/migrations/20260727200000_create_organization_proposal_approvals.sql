create table if not exists public.organization_proposal_approvals (

  id uuid primary key default gen_random_uuid(),

  proposal_id uuid not null
    references public.organization_reorganization_proposals(id)
    on delete cascade,


  approver_id uuid
    references auth.users(id)
    on delete set null,


  status text not null default 'pending'
    check (
      status in (
        'pending',
        'approved',
        'rejected'
      )
    ),


  comment text,


  approved_at timestamptz,


  created_at timestamptz not null default now(),


  updated_at timestamptz not null default now()

);


create index if not exists organization_proposal_approvals_proposal_idx

on public.organization_proposal_approvals(proposal_id);


comment on table public.organization_proposal_approvals is
'Registro de aprovações das propostas de reorganização organizacional.';
