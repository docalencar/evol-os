# MVP-PR1 · Phase 8A — Authorization Primitives Re-audit + Characterization

Additive, test-first, **no behavioral cutover**. This PR re-audits the existing
authorization primitives and encodes the Phase 8 invariants (and the legacy
behavior 8B/8C will remove) as an executable pgTAP characterization. No policy,
grant, migration or app change.

## Primitive re-audit (all SECURE — no change made)

- `is_company_member(uuid)` / `has_company_role(uuid, text[])` (0003, hardened
  0056): `SECURITY DEFINER`, `search_path=public`, actor from `auth.uid()`,
  require `status='active'`, role read from `company_members` (never JWT/metadata),
  foreign tenant → false, non-recursive (definer bypasses RLS), execute revoked
  from public and granted to `authenticated`.
- `create_company_with_owner(text,text)` (final def 0044): `SECURITY DEFINER`,
  `search_path=public`, actor `auth.uid()` (fail-closed `AUTH_REQUIRED`), enforces
  the single-active-company invariant (`USER_ALREADY_HAS_COMPANY`), hardcodes the
  creator's role to `owner`, uses `raw_user_meta_data.full_name` only for the
  owner person's display name (not authority), execute revoked from public and
  granted only to `authenticated`. No privilege escalation.
- Owner invariant: `enforce_company_member_owner_invariants` (0071) DB-enforces
  last-active-owner protection and an active-owner-actor requirement for owner
  mutations, with a bootstrap branch for the definer/superuser path.
- People↔membership coherence: `enforce_active_membership_people_invariant`
  (deferrable, on `company_members`) and `protect_active_membership_people_link`
  (on `people`). The latter blocks *changing/removing* an existing link but
  returns early when `old.user_id is null` — so setting `people.user_id` from
  null is not prevented (the 8C target).

## Real enforcement boundary (corrected after the DB run)

The core tenant tables (`companies`, `company_members`, `people`) have **no direct
table grant to `authenticated`** — there is no `grant ... to authenticated` for them
in any migration, and the local test DB confirms `permission denied for table people`
for `authenticated`. Table privilege is evaluated **before** RLS, so a direct
SELECT/INSERT/UPDATE/DELETE fails at the privilege layer and the RLS policies are
never reached. All human reads/writes flow through the SECURITY DEFINER helpers
(`is_company_member` / `has_company_role`) and the trusted RPCs. This mirrors the
canonical pattern in `tenant_multiuser_persistence_foundation.test.sql`
(`not has_table_privilege('authenticated', ...)`).

Therefore the earlier "active owner/hr can direct-DML" statement was **incorrect**:
there is no currently reachable `authenticated` direct-DML path.

## Invariants proven by the pgTAP (through the real permitted path)

- Active membership is required; inactive members have no read/role authority
  (via `is_company_member` / `has_company_role`).
- Tenant isolation: a member of Alpha cannot authorize in Beta; a forged
  `company_id`/`user_role` JWT claim grants nothing (authority is DB membership).
- `authenticated` holds no direct SELECT/INSERT/UPDATE/DELETE on
  `company_members` or `people` — the real write boundary.
- The owner-administration / last-active-owner invariant trigger is installed on
  `company_members` (its behavior is exercised by
  `tenant_access_trusted_persistence.test.sql`).

## Latent surfaces (targets for later PRs — NOT permanent, reachable only via grant-holding roles)

- **8B target:** the `company_members` `for all` RLS write policy is latent
  defense-in-depth (no `authenticated` grant exercises it today); 8B removes it so
  membership mutations are RPC-only by construction. DB-before-app safe — the app
  already writes memberships only through the trusted RPCs.
- **8C target:** `protect_active_membership_people_link` returns early on a
  `null -> value` transition of `people.user_id`, so a grant-holding role (the
  SECURITY DEFINER RPCs / `service_role`) could set the link outside the accept
  RPC. 8C hardens this path. The app never sets `user_id` this way.

## Files

- `supabase/tests/tenant_authorization_cutover_characterization.test.sql` (new,
  24 asserts). No migration (all primitives already correct).

## Gate

Run `npx supabase test db` (full suite). No app/DB/RLS/grant change.
