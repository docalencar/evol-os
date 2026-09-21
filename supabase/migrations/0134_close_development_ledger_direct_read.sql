-- D-SEC1 — close direct client reads on the Development application ledger.
--
-- WHAT THIS FIXES
--
-- 0068 created the deterministic template-application ledger, revoked every
-- privilege on it from PUBLIC, anon and authenticated — and then granted SELECT
-- straight back to `authenticated`, scoped by an RLS policy of
-- `is_company_member(company_id)`. That policy is plain tenant membership, so any
-- active member of a company can read every row for every plan in that tenant.
--
-- The snapshot is what makes that expensive. Its payload is verified against the
-- live template version at application time and then frozen, and it carries
-- `plan.employeeId` alongside each goal's `currentLevel`, `expectedLevel` and
-- `appliedTargetLevel` plus the competency's name. In other words: a named
-- colleague's assessed competency levels, and the development actions assigned to
-- close the gap. D-P0 restricts exactly that to the subject, their current
-- manager, the active operational owner and owner/admin/hr.
--
-- 0069 already revoked these tables from `service_role`, and it gave the sibling
-- `development_template_application_audit` a policy restricted to
-- owner/admin/hr. The authors knew how to gate this ledger when they meant to;
-- the four data tables were simply left on tenant-wide membership.
--
-- WHY CLOSING IT COSTS NOTHING
--
-- Every function that reads these relations is SECURITY DEFINER owned by the
-- migration role, and RLS here is enabled but NOT forced, so the owner is
-- unaffected by both the grant and the policy:
--
--   reserve_development_template_application_v1    (0069 → 0132)
--   complete_development_template_application_v1   (0069 → 0132)
--   get_company_retention_pressure_v1              (0126)
--   get_authorized_development_plan_origins_v1     (0133)
--
-- The live application path calls those functions and nothing else — it issues no
-- direct table read. The only application module that ever selected these tables
-- is a compatibility adapter with no remaining consumer. Retention reaches the
-- ledger through the counts-only boundary, which `service_role` executes.
--
-- 0133 is the proof that the product capability survives: it returns the
-- historical plan origin to exactly the actors D-P0 allows, authorizing each row
-- with `can_read_development_plan_v1`, and it needs no table privilege from its
-- caller. It is strictly narrower than the grant being removed here.
--
-- WHAT THIS DELIBERATELY DOES NOT DO
--
-- The SELECT policies stay. With the grant gone they are unreachable, and that is
-- the point: if a later migration re-grants SELECT carelessly, the member scope is
-- still there rather than the table being wide open. RLS stays enabled for the
-- same reason. No function, owner, trigger or retention relation is touched, and
-- `development_template_application_audit` keeps its own owner/admin/hr posture.
--
-- This migration therefore changes exactly one thing: the table ACL of the four
-- ledger relations. Every other security fingerprint must come out identical.

revoke select on table
  public.development_template_applications,
  public.development_template_application_attempts,
  public.development_template_application_snapshots,
  public.development_template_application_lineage
from authenticated;

comment on table public.development_template_application_snapshots is
  'Immutable evidence of a deterministic template application. INTERNAL: no client '
  'role holds a direct privilege. Historical plan origin is read through '
  'get_authorized_development_plan_origins_v1, which authorizes per plan with '
  'can_read_development_plan_v1; retention counts through '
  'get_company_retention_pressure_v1. The member-scoped RLS policy is retained as '
  'defence in depth and is unreachable while no grant exists.';

comment on table public.development_template_application_lineage is
  'Immutable link between a Development plan and the template version that produced '
  'it. INTERNAL: no client role holds a direct privilege — see the snapshot table '
  'comment for the purpose-bound read boundaries.';

notify pgrst, 'reload schema';
