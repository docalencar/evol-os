-- MVP-PR1 Phase 8B — company_members write-boundary hardening (RPC-only enforcement).
--
-- Context (proven by PR 8A): human membership mutations already flow exclusively
-- through the trusted SECURITY DEFINER RPCs (issue/accept/change_role/deactivate/
-- transfer), and no application code writes company_members directly — every
-- apps/web access to the table is a .select(...). The only remaining generic human
-- write surface is the legacy "owners and admins manage company members" FOR ALL
-- policy from migration 0003.
--
-- This migration removes that policy so company_members is RPC-only by construction:
--   * INSERT/UPDATE/DELETE keep no matching policy, so under RLS they are default-
--     denied for every client role (owner/admin included) — closing the last direct
--     mutation path wherever the underlying table grant exists.
--   * The "members can read company members" SELECT policy is preserved, so member
--     reads continue to work wherever the SELECT grant exists.
--   * The trusted RPCs are SECURITY DEFINER owned by the table owner and bypass RLS
--     (no FORCE ROW LEVEL SECURITY anywhere), so they are unaffected.
--   * RLS stays enabled; no grants are changed; service_role is not added to the
--     human path (the RPCs remain revoked from service_role).
--
-- Deployment: DB-before-app safe — the application performs no direct writes, so no
-- runtime path depends on the removed policy. Rollback: re-create the policy exactly
-- (compensating policy shown below), never disable RLS.

drop policy "owners and admins manage company members" on public.company_members;

comment on table public.company_members is
  'Membership mutations are RPC-only: they must go through the trusted tenant-access SECURITY DEFINER RPCs (issue/accept/change_role/deactivate/transfer). Direct INSERT/UPDATE/DELETE is intentionally left unpoliced under RLS (default deny). Reads remain available through the "members can read company members" SELECT policy.';

-- Rollback (compensating policy), for reference:
--   create policy "owners and admins manage company members"
--     on public.company_members
--     for all
--     using (public.has_company_role(company_id, array['owner','admin']));
