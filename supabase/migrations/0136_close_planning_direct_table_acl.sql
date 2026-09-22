-- PLN-SEC3 — make the canonical Planning table ACL explicit and forward-only.

revoke all on table
  public.organization_planning_workspaces,
  public.organization_planning_scenarios,
  public.organization_planning_snapshots,
  public.organization_planning_change_sets
from public, anon, authenticated;
