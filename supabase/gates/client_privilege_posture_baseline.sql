-- F-GATE1 — client-privilege posture: the one assertion the repo authorizes,
-- plus a deterministic baseline for the Review comparison that closes the drift.
--
-- WHAT THIS FILE DELIBERATELY DOES NOT DO
--
-- F-GATE1 was asked for a sweep detecting "client grants incompatible with
-- CLOSED tables". The repository does not define that, and this suite refuses to
-- invent it:
--
--   * "CLOSED table" appears exactly three times in docs (CHANGELOG.md:27,48 and
--     ENVIRONMENT-MIGRATION-STATUS.md:187) and is never defined as a set. There
--     is no registry, and docs/engineering/database-standards.md does not
--     mention revoke at all.
--   * the committed precedents encode THREE different postures, so no single
--     "zero client privileges" rule can be derived without overriding one of
--     them:
--       A. revoke all from clients, nothing re-granted — 0063 notifications,
--          0069 template audit, 0114 snapshots, 0121 career/seniority,
--          0131 development templates, 0135 planning audit, 0136 planning,
--          0142 turnover facts;
--       B. revoke all from clients, then grant SELECT back — 0076
--          tenant_membership_preferences, 0130 development_reviews and
--          development_private_audit;
--       C. partial revoke only — 0112 revokes INSERT on assessment_responses
--          and nothing else.
--
-- A rule asserting zero client privileges would report B and C as violations of
-- a contract they never signed. So the posture pass/fail is a STOP, reported to
-- the Human Reviewer, not resolved here.
--
-- WHY A LOCAL SWEEP COULD NOT SETTLE IT ANYWAY
--
-- After `supabase db reset` the local privileges ARE the net effect of the
-- committed migrations, so the local database cannot disagree with the repo
-- about its own posture. The drift is a LOCAL-versus-REVIEW differential, born
-- in the hosted environment's default privileges — CHANGELOG.md:48 says exactly
-- that: it "passa nos testes locais e só aparece na promoção ao Review". The
-- useful local artifact is therefore a baseline the Review read can be compared
-- against, which is what this file emits.

begin;
create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, pg_temp;
select no_plan();

create temporary view f_gate1_client_privilege as
select g.table_name, g.grantee, g.privilege_type
  from information_schema.role_table_grants g
  join pg_class c on c.relname = g.table_name
  join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
 where g.table_schema = 'public'
   and c.relkind = 'r'
   and g.grantee in ('PUBLIC', 'anon', 'authenticated');

-- ---------------------------------------------------------------------------
-- WITHDRAWN ASSERTIONS — both were this gate's hypotheses, not canonical
-- contract, and the first real run proved it.
--
-- The gate originally asserted (a) zero default ACLs on schema `public` and
-- (b) zero client TRUNCATE. Both went red locally, and re-reading the contract
-- shows the gate was wrong, not the database:
--
--   (a) The canonical prohibition is that OUR MIGRATIONS must not use
--       `ALTER DEFAULT PRIVILEGES` — 0121:18 ("it does NOT use ALTER DEFAULT
--       PRIVILEGES (no global environment change)"), repeated in 0126:36 and
--       0127:76, and enforced structurally over tooling SOURCE by
--       scripts/review/promotion-tooling-guards-0129.test.mjs:56. That is a
--       statement about the SQL we write, not about the database's state. The
--       platform installs its own default privileges: CHANGELOG.md:27 and
--       ENVIRONMENT-MIGRATION-STATUS.md:187 both say the grants 0121 had to
--       revoke were "inherited from the Supabase environment's default
--       privileges". Asserting zero default ACLs therefore asserts that the
--       platform is configured differently than it is, and the repo nowhere
--       claims that. The prohibition is now checked where it is true — over
--       migration TEXT, in scripts/local/verify-f-gate1-foundation-sweeps.sh.
--
--   (b) Client TRUNCATE follows directly from (a): the inherited default
--       privileges grant table privileges wholesale, so TRUNCATE is present on
--       every table no migration has revoked. "No client TRUNCATE" is true only
--       for the tables our migrations explicitly closed — which is the
--       per-table posture this file documents as a STOP, not a global rule.
--
-- Keeping either assertion would have meant inventing policy to make a red
-- turn green, which F-GATE1 exists to prevent. Both are withdrawn and their
-- subject matter is reported as census below. Reinstating them requires a
-- canonical decision about the platform's default privileges, which is a
-- product/security decision and not this gate's to take.
-- ---------------------------------------------------------------------------
select ok(true, 'census DEFAULT_ACL_ON_PUBLIC=' ||
  (select count(*)::text from pg_default_acl d
     join pg_namespace n on n.oid = d.defaclnamespace
    where n.nspname = 'public') ||
  ' (platform-installed; our migrations may not add any — asserted over text by the runner)');

select ok(true, 'census CLIENT_TRUNCATE_ROWS=' ||
  (select count(*)::text from f_gate1_client_privilege where privilege_type = 'TRUNCATE') ||
  ' on ' ||
  (select count(distinct table_name)::text from f_gate1_client_privilege where privilege_type = 'TRUNCATE') ||
  ' table(s)');

-- ---------------------------------------------------------------------------
-- BASELINE — the artifact that makes the drift provable later.
--
-- A stable digest over the ordered (table, grantee, privilege) triples, plus the
-- counts behind it. A later AUTHORIZED read-only Review query producing the same
-- projection can be compared against this value byte for byte: equal means no
-- drift, different means the environment granted something no migration did.
-- That comparison is a separate, explicitly authorized slice.
-- ---------------------------------------------------------------------------
select ok(true, 'baseline CLIENT_PRIVILEGE_FINGERPRINT=' || coalesce((
  select md5(string_agg(table_name || ':' || grantee || ':' || privilege_type, ';'
                        order by table_name, grantee, privilege_type))
    from f_gate1_client_privilege), '<empty>'));

select ok(true, 'baseline CLIENT_PRIVILEGE_ROWS=' ||
  (select count(*)::text from f_gate1_client_privilege));

select ok(true, 'baseline CLIENT_EXPOSED_TABLES=' ||
  (select count(distinct table_name)::text from f_gate1_client_privilege));

select ok(true, 'baseline PUBLIC_TABLES=' || (select count(*)::text
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'));

-- Census per role, so a Review comparison can be narrowed without re-deriving
-- the projection.
select ok(true, 'census anon=' ||
  (select count(*)::text from f_gate1_client_privilege where grantee = 'anon') ||
  ' authenticated=' ||
  (select count(*)::text from f_gate1_client_privilege where grantee = 'authenticated') ||
  ' PUBLIC=' ||
  (select count(*)::text from f_gate1_client_privilege where grantee = 'PUBLIC'));

-- Tables that a committed migration revoked `all` from clients and that
-- nonetheless still carry a client privilege locally. Under posture B this is
-- expected (SELECT was re-granted on purpose); it is listed so the Review
-- comparison can tell an intentional re-grant from drift, and judged by nobody
-- here.
select ok(true, 'census tables with any client privilege: ' || coalesce((
  select string_agg(distinct table_name, ', ' order by table_name)
    from f_gate1_client_privilege), '<none>'));

select * from finish();
rollback;
