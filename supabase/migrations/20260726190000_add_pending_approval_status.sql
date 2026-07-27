alter table public.organization_reorganization_proposals
drop constraint if exists organization_reorganization_proposals_status_check;


alter table public.organization_reorganization_proposals
add constraint organization_reorganization_proposals_status_check
check (
  status in (
    'draft',
    'review',
    'pending_approval',
    'approved',
    'rejected',
    'applied'
  )
);
