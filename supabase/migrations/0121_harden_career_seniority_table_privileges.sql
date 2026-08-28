-- Career / Seniority + Position Taxonomy — Slice 0121: closed-table privilege hardening.
--
-- Forward-only security hardening. The three Career/Seniority tables are CLOSED
-- TABLES by contract (RLS enabled; all reads/writes go through SECURITY DEFINER
-- read/mutation boundaries; there is NO direct application table access anywhere in
-- apps/web). Their foundation migrations (0100/0102/0120) relied on "no default
-- table grants", which holds on a local `supabase db reset` shadow database but NOT
-- on environments (e.g. Canonical Review) where the Supabase project-level default
-- privileges auto-grant new public tables to anon and authenticated. A read-only ACL
-- probe confirmed anon and authenticated held SELECT/INSERT/UPDATE/DELETE (plus
-- TRUNCATE/REFERENCES/TRIGGER/MAINTAIN) on all three tables on Review, so the
-- closed-table defense-in-depth contract failed there even though RLS is enabled.
--
-- This migration closes exactly those three tables explicitly, mirroring the
-- established project pattern (0076 `revoke all on table … from public, anon,
-- authenticated`). It is REVOKE-ONLY: it does NOT touch data, columns, constraints,
-- indexes, RLS, policies, functions, RPC EXECUTE grants, triggers or migration
-- history, and it does NOT use ALTER DEFAULT PRIVILEGES (no global environment
-- change). `service_role` and `postgres` are intentionally NOT mentioned and keep
-- their privileges. REVOKE of a non-existent grant is a no-op, so this is safe and
-- idempotent on the local database (which never had the grants) and effective on
-- Review (which did). Scope is limited to the three confirmed Career/Seniority
-- tables; any similar exposure elsewhere is a separate follow-up audit.

revoke all on table public.seniority_levels
  from public, anon, authenticated;

revoke all on table public.position_seniority_profiles
  from public, anon, authenticated;

revoke all on table public.position_seniority_competencies
  from public, anon, authenticated;

notify pgrst, 'reload schema';
