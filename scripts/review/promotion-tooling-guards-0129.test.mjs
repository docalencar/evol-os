import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const migrationPath = resolve(here, "../../supabase/migrations/0129_harden_activity_events_client_privileges.sql")
const runnerPath = resolve(here, "promote-0129-activity-events-hardening.sh")
const prePath = resolve(here, "verify-0129-activity-events-hardening-pre.sh")
const postPath = resolve(here, "verify-0129-activity-events-hardening-post.sh")
const migration = () => readFileSync(migrationPath, "utf8")
const runner = () => readFileSync(runnerPath, "utf8")
const gate = () => readFileSync(resolve(here, "run-0129-local-db-gate.sh"), "utf8")

const classify = (overrides = {}) => {
  const source = runner()
  const fn = source.match(/classify_state\(\) \{[\s\S]*?\n\}/)?.[0]
  assert.ok(fn)
  const fixture = {
    M128: "1", M129: "0", PUB: "false", ANON: "true", AUTH: "true",
    CLIENT: "16", ACL_FP: "46875263bd6598c4534e2df7d1847a5e", POLICIES: "2",
    POLICY_FP: "44f737d45509824130c2ba631de442ce", SERVICE: "8",
    TL: "true", DEF: "true", EXEC_AUTH: "true", BRIDGE: "true", FKS: "7",
    RPCS: "5", FWP: "0", FWL: "0",
    EXPECTED_PRE_ACTIVITY_ACL_FINGERPRINT: "46875263bd6598c4534e2df7d1847a5e",
    EXPECTED_ACTIVITY_POLICY_FINGERPRINT: "44f737d45509824130c2ba631de442ce",
    ...overrides,
  }
  const assignments = Object.entries(fixture).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n")
  const result = spawnSync("bash", ["-c", `${assignments}\n${fn}\nclassify_state`], { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

test("classifier distinguishes canonical PRE, partial drift and exact POST", () => {
  assert.equal(classify(), "READY_TO_APPLY")
  assert.notEqual(classify({ AUTH: "false" }), "READY_TO_APPLY")
  assert.notEqual(classify({ ACL_FP: "46875263bd6598c4534e2df7d1847a5f" }), "READY_TO_APPLY")
  assert.equal(
    classify({ M129: "1", ANON: "false", AUTH: "false", CLIENT: "0" }),
    "ALREADY_APPLIED_EXACTLY",
  )
  assert.notEqual(
    classify({ M129: "1", ANON: "false", AUTH: "true", CLIENT: "8" }),
    "ALREADY_APPLIED_EXACTLY",
  )
})

test("0129 explicitly closes every client relation privilege without touching service_role", () => {
  const source = migration()
  assert.match(source, /revoke select, insert, update, delete, truncate, references, trigger, maintain\s+on table public\.activity_events\s+from public, anon, authenticated;/s)
  assert.doesNotMatch(source, /from[^;]*service_role/i)
  assert.doesNotMatch(source, /alter default privileges/i)
  assert.doesNotMatch(source, /grant\s/i)
})

test("required revoke mutations go RED", () => {
  const contractHolds = (source) =>
    /from public, anon, authenticated;\s*\n\s*notify pgrst/s.test(source)
    && !/grant select on public\.activity_events to authenticated/.test(source)
  for (const mutation of [
    (source) => source.replace("public, anon, authenticated", "public, anon"),
    (source) => source.replace("public, anon, authenticated", "public, authenticated"),
    (source) => `${source}\ngrant select on public.activity_events to authenticated;\n`,
  ]) {
    const changed = mutation(migration())
    assert.equal(contractHolds(changed), false)
  }
})

test("timeline company filtering is pinned by migration, pgTAP and runner", () => {
  const testSource = readFileSync(resolve(here, "../../supabase/tests/activity_events_client_privilege_hardening.test.sql"), "utf8")
  const contractHolds = (migrationSource, pgTapSource, runnerSource) =>
    /visibility=''company''/.test(migrationSource)
    && /visibility=''company''/.test(pgTapSource)
    && /TIMELINE_FILTERS_COMPANY=true/.test(runnerSource)
  assert.equal(contractHolds(migration(), testSource, runner()), true)
  assert.equal(contractHolds(migration().replace("visibility=''company''", "visibility=''restricted''"), testSource, runner()), false)
})

test("partial 0129 states cannot reach the mutating path", () => {
  const source = runner()
  assert.match(source, /if \[ "\$STATE" != READY_TO_APPLY \]/)
  assert.match(source, /PROMOTION_OUTCOME=BLOCKED_\$\{STATE\}/)
  assert.match(source, /ALREADY_APPLIED_EXACTLY_NO_MUTATION/)
  assert.match(source, /UNKNOWN_INSPECT_BEFORE_ANY_RETRY/)
  // One mutating push per transport and no more. The dry-run probes are not
  // counted: they are non-mutating, which is the whole reason they can be used
  // to discover which transport works.
  const mutating = source.match(/supabase db push (?!--help)(?:[^\n]*?)\$YES_FLAG/g) ?? []
  assert.equal(mutating.length, 3, "exactly one push per discovered transport")
  assert.equal(
    (source.match(/case "\$TRANSPORT" in/g) ?? []).length,
    1,
    "and they are alternatives in a single case, not a sequence",
  )
})

test("runner is pinned to Review and guards the linked target", () => {
  const source = runner()
  assert.match(source, /REVIEW_REF="rwfvxvbzaosgcyfxdjpt"/)
  assert.match(source, /supabase\/\.temp\/project-ref/)
  assert.doesNotMatch(source, /gzrrwyiqfbnyprkdeqvm|oudngmrdtgengilpqqnz/)
})

test("verifiers are read-only and contain no database mutation statement", () => {
  for (const path of [prePath, postPath]) {
    const source = readFileSync(path, "utf8")
    assert.match(source, /default_transaction_read_only = on|verify-0129-activity-events-hardening-pre\.sh/)
    assert.doesNotMatch(source, /supabase db push|\brevoke\b|\bgrant\b|\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b/i)
  }
})

test("POST proves direct reads fail behaviorally for both client roles", () => {
  const source = readFileSync(postPath, "utf8")
  assert.match(source, /set role authenticated; select \* from public\.activity_events limit 0/)
  assert.match(source, /set role anon; select \* from public\.activity_events limit 0/)
  assert.match(source, /permission denied for table activity_events/)
  assert.match(runner(), /POST_BEHAVIOR_VERIFICATION_FAILED_DO_NOT_RETRY/)
})

// --------------------------------------------------------------------------
// E5-R1F — the connection contract.
//
// The first promotion attempt died before a single SQL statement ran, because
// db.<ref>.supabase.co publishes only an AAAA record and this network cannot
// route IPv6. These tests execute the runner's URL validator as a real bash
// function rather than pattern-matching it, so a validator that silently stops
// discriminating fails them.
// --------------------------------------------------------------------------

const POOLER = (over = {}) => {
  const p = { user: "postgres.rwfvxvbzaosgcyfxdjpt", pass: "REDACTED",
    host: "aws-0-sa-east-1.pooler.supabase.com", port: "5432", db: "postgres", query: "", ...over }
  return `postgresql://${p.user}:${p.pass}@${p.host}:${p.port}/${p.db}${p.query}`
}

const validateUrl = (url) => {
  const fn = runner().match(/^validate_review_db_url\(\) \{[\s\S]*?\n\}/m)?.[0]
  assert.ok(fn, "the URL validator must exist as an extractable function")
  const preamble = [
    'REVIEW_REF=rwfvxvbzaosgcyfxdjpt',
    "POOLER_HOST_SUFFIX='.pooler.supabase.com'",
    "EXPECTED_POOLER_PORT=5432",
    "EXPECTED_DB_NAME=postgres",
  ].join("\n")
  const result = spawnSync("bash", ["-c", `${preamble}\n${fn}\nvalidate_review_db_url "$1"`, "_", url],
    { encoding: "utf8" })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

/** Index of the first mutating push, for reachability proofs. */
const firstPushAt = () => {
  const at = runner().search(/case "\$TRANSPORT" in/)
  assert.notEqual(at, -1, "the mutating push must be locatable")
  return at
}
const outcomeAt = (token) => {
  const at = runner().indexOf(token)
  assert.notEqual(at, -1, `${token} must exist`)
  return at
}

test("the IPv6 direct endpoint is not the only verification path", () => {
  const source = runner()
  // The direct host may be NAMED in the explanation of why it failed, but it
  // must not be what psql or the verifiers are pointed at.
  assert.doesNotMatch(source, /^DB_HOST="db\.\$\{REVIEW_REF\}\.supabase\.co"/m)
  assert.match(source, /DB_HOST="\$P_HOST"/, "the host comes from the supplied pooler URL")
  assert.match(source, /E5_REVIEW_DB_URL/, "the operator-supplied URL is the documented input")
})

test("the canonical Session pooler URL is accepted", () => {
  assert.equal(validateUrl(POOLER()), "URL_OK")
  // Region is part of the pooler hostname and must not be constrained: the
  // runner is forbidden from inferring it.
  assert.equal(validateUrl(POOLER({ host: "aws-1-us-east-2.pooler.supabase.com" })), "URL_OK")
})

test("a URL for a different project is rejected", () => {
  assert.equal(validateUrl(POOLER({ user: "postgres.aaaaaaaaaaaaaaaaaaaa" })), "URL_WRONG_PROJECT")
  assert.equal(validateUrl(POOLER({ user: "postgres" })), "URL_WRONG_PROJECT")
  // Production and Legacy are refused as a CONSEQUENCE of the allow-list, not by
  // a deny-list naming them. Writing their refs into a promotion runner is what
  // the repository's own guard forbids, and a deny-list is the weaker construct
  // anyway: it only rejects the projects someone remembered to add. These two
  // fixtures are built from the real refs to prove the allow-list catches them,
  // and the refs stay out of the runner.
  for (const ref of ["gzrrwyiqfbnyprkdeqvm", "oudngmrdtgengilpqqnz"]) {
    assert.equal(validateUrl(POOLER({ user: `postgres.${ref}` })), "URL_WRONG_PROJECT")
    assert.equal(validateUrl(POOLER({ host: `aws-0-sa-east-1.pooler.supabase.com`, user: `postgres.${ref}` })), "URL_WRONG_PROJECT")
  }
})

test("a wrong port is rejected", () => {
  // 6543 is the transaction pooler: same host, no session semantics, and
  // migrations need a session.
  assert.equal(validateUrl(POOLER({ port: "6543" })), "URL_BAD_PORT")
  assert.equal(validateUrl(POOLER({ port: "5433" })), "URL_BAD_PORT")
})

test("a non-Supabase pooler host is rejected", () => {
  assert.equal(validateUrl(POOLER({ host: "pooler.supabase.com.evil.example" })), "URL_NOT_POOLER_HOST")
  assert.equal(validateUrl(POOLER({ host: "db.rwfvxvbzaosgcyfxdjpt.supabase.co" })), "URL_NOT_POOLER_HOST")
  // A bare suffix with no tenant-region label in front of it is not a host.
  assert.equal(validateUrl(POOLER({ host: ".pooler.supabase.com" })), "URL_NOT_POOLER_HOST")
  assert.equal(validateUrl(POOLER({ db: "prod" })), "URL_BAD_DATABASE")
  assert.equal(validateUrl(POOLER({ query: "?sslmode=disable" })), "URL_SSL_DISABLED")
  assert.equal(validateUrl("not-a-url"), "URL_MALFORMED")
})

test("a missing URL fails closed before anything can be mutated", () => {
  assert.equal(validateUrl(""), "URL_MISSING")
  assert.ok(
    outcomeAt("PROMOTION_OUTCOME=NO_MUTATION_REVIEW_DB_URL_INVALID") < firstPushAt(),
    "the invalid-URL exit must precede the push",
  )
})

test("connection, authentication and identity are three outcomes, not one", () => {
  const source = runner()
  for (const token of [
    "PROMOTION_OUTCOME=NO_MUTATION_CONNECTION_FAILED",
    "PROMOTION_OUTCOME=NO_MUTATION_AUTH_FAILED",
    "PROMOTION_OUTCOME=NO_MUTATION_TARGET_IDENTITY_FAILED",
    "PROMOTION_OUTCOME=NO_MUTATION_PRE_QUERY_FAILED",
  ]) {
    assert.ok(outcomeAt(token) < firstPushAt(), `${token} must be unreachable from the push`)
  }
  // Authentication is distinguished by what the server said, not by guessing.
  assert.match(source, /password authentication failed[^\n]*Tenant or user not found/,
    "Supavisor reports a bad tenant key as an auth error; that string must be recognised")
  // Ordering: connect, then identity, then PRE.
  const connect = source.indexOf("PREFLIGHT=CONNECTED")
  const identity = source.indexOf("PREFLIGHT=TARGET_IDENTITY_VERIFIED")
  const pre = source.indexOf('if ! snapshot "$PRE"')
  assert.ok(connect < identity && identity < pre, "PRE runs only after connection and identity")
})

test("project identity is proven after connecting, not inferred from the hostname", () => {
  const source = runner()
  // The pooler hostname is shared across every project in a region, so the
  // tenant key in the username is the routing authority.
  assert.match(source, /\[ "\$user" = "postgres\.\$\{REVIEW_REF\}" \]/)
  // And the database that answers must be a managed remote, not a loopback.
  assert.match(source, /IS_LOOPBACK/)
  assert.match(source, /HAS_MIGRATION_LEDGER/)
  assert.match(source, /SUPABASE_ROLES/)
  assert.match(source, /IDENTITY_FAIL/)
  assert.doesNotMatch(source, /gzrrwyiqfbnyprkdeqvm|oudngmrdtgengilpqqnz/)
})

test("the pooler URL never reaches a log, a file, or psql argv", () => {
  const source = runner()
  // psql is given components; the password travels in PGPASSWORD only.
  assert.match(source, /export PGPASSWORD="\$P_PASS"/)
  assert.doesNotMatch(source, /psql[^\n]*"\$REVIEW_DB_URL"/)
  // The scrubber itself necessarily mentions the password variable — it is the
  // one printf allowed to, because it replaces the value rather than emitting
  // it. Every OTHER printing statement is checked against the raw variable.
  const withoutScrubber = source.replace(/^redacted\(\) \{[\s\S]*?\n\}/m, "")
  assert.doesNotMatch(withoutScrubber, /(say|echo|printf)[^\n]*\$\{?(REVIEW_DB_URL|P_PASS|PGPASSWORD)\b/)
  // Everything the CLI emits is scrubbed, because a CLI error can quote the
  // connection string back at us.
  assert.match(source, /redacted\(\) \{/)
  assert.match(source, /\$\{line\/\/"\$P_PASS"\/\[REDACTED\]\}/)
  for (const stream of ['redacted "$PUSH"', 'redacted "$DRY"', 'redacted "$CONNERR"']) {
    assert.ok(source.includes(stream), `${stream} must be scrubbed before it is shown`)
  }
})

test("the CLI transport is discovered, and argv exposure is the last resort", () => {
  const source = runner()
  const envAt = source.indexOf('SUPABASE_DB_URL="$REVIEW_DB_URL" supabase db push --dry-run')
  const argvAt = source.indexOf('supabase db push --db-url "$REVIEW_DB_URL" --dry-run')
  assert.notEqual(envAt, -1, "an environment binding must be attempted first")
  assert.notEqual(argvAt, -1, "argv is the documented fallback")
  assert.ok(envAt < argvAt, "environment before argv, so the URL stays out of the process table")
  // A transport only qualifies by producing the expected pending set.
  assert.equal((source.match(/\[ "\$\(pending_set "\$DRY"\)" = "\$EXPECTED_PENDING" \]/g) ?? []).length, 3)
  assert.match(source, /NOTE: this CLI has no environment binding/,
    "the residual exposure must be stated to the operator, not hidden")
})

test("the local gate executes the real PRE SQL against a real server", () => {
  const source = gate()
  assert.match(source, /@127\.0\.0\.1:\*\|\*@localhost:\*/, "loopback only")
  assert.match(source, /verify-0129-activity-events-hardening-pre\.sh/, "it runs the real PRE verifier")
  assert.match(source, /supabase db reset/)
  assert.match(source, /supabase test db/)
  assert.match(source, /ACL fingerprint did not change when the privileges did/)
  // It must never be pointed at a remote.
  assert.doesNotMatch(source, /pooler\.supabase\.com|supabase\.co|E5_REVIEW_DB_URL/)
})

// --------------------------------------------------------------------------
// E5-R1F2 — the gate's two ACL states.
//
// The first real run of the gate failed, correctly: it asserted
// ACTIVITY_SERVICE_PRIVILEGES=8 in both phases, assuming the local baseline and
// Review's were the same shape. They are not. Review inherited broad ACLs from
// migration 0039; locally service_role holds Dxtm (4) and never held arwd on
// this table. 0129 revokes from public, anon and authenticated only, so it is
// neither the cause of that difference nor a fix for it.
//
// These tests execute the gate's own comparison function against synthetic
// snapshots, so the RED cases are proven without a database.
// --------------------------------------------------------------------------

const CANONICAL_PRE_RELACL =
  "{postgres=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres,service_role=arwdDxtm/postgres}"
const CANONICAL_PRE_FINGERPRINT = "46875263bd6598c4534e2df7d1847a5e"
const LOCAL_HARDENED_RELACL = "{postgres=arwdDxtm/postgres,service_role=Dxtm/postgres}"
const LOCAL_HARDENED_FINGERPRINT = "0000000000000000000000000000beef"

const gateFunction = (name) => {
  const fn = gate().match(new RegExp(`^${name}\\(\\) \\{[\\s\\S]*?\\n\\}`, "m"))?.[0]
  assert.ok(fn, `${name} must be an extractable function`)
  return fn
}
const broadExpectations = () => {
  const block = gate().match(/^BROAD_EXPECTATIONS="([\s\S]*?)"$/m)?.[1]
  assert.ok(block, "the broad expectations must be a readable block")
  return block
}

/**
 * The gate's expectation block references its pinned constants by name, so the
 * block is re-expanded by bash against the gate's own assignments rather than
 * being string-substituted here. A test that substituted its own values would
 * still pass if the gate stopped pinning the canonical fingerprint.
 */
const gateConstants = () => {
  const source = gate()
  return ["CANONICAL_REVIEW_PRE_RELACL", "CANONICAL_REVIEW_PRE_FINGERPRINT"]
    .map((name) => {
      const line = source.match(new RegExp(`^${name}='[^']*'$`, "m"))?.[0]
      assert.ok(line, `${name} must be pinned in the gate`)
      return line
    })
    .join("\n")
}

/** Runs the gate's real check_expectations against a synthetic snapshot. */
const runCheck = (snapshot, expectations) => {
  const file = join(tmpdir(), `e5r1f2-${Math.random().toString(36).slice(2)}.txt`)
  writeFileSync(file, Object.entries(snapshot).map(([k, v]) => `${k}=${v}`).join("\n") + "\n")
  const script = [
    `say() { printf '%s\\n' "$*"; }`,
    gateConstants(),
    gateFunction("label"),
    gateFunction("check_expectations"),
    `EXPECTATIONS="$2"`,
    `check_expectations "$1" test "$(eval "printf '%s' \\"$EXPECTATIONS\\"")"`,
  ].join("\n")
  const r = spawnSync("bash", ["-c", script, "_", file, expectations], { encoding: "utf8" })
  rmSync(file, { force: true })
  return { green: r.status === 0, out: r.stdout }
}

/** A snapshot of the synthetic canonical Review PRE state. */
const broadSnapshot = (over = {}) => ({
  ACTIVITY_CLIENT_PRIVILEGES: "16", ACTIVITY_SERVICE_PRIVILEGES: "8",
  ACTIVITY_SELECT_ANON: "true", ACTIVITY_SELECT_AUTHENTICATED: "true",
  ACTIVITY_SELECT_PUBLIC: "false",
  ACTIVITY_ACL_FINGERPRINT: CANONICAL_PRE_FINGERPRINT,
  ACTIVITY_RELACL: CANONICAL_PRE_RELACL,
  ACTIVITY_POLICY_COUNT: "2", ACTIVITY_RLS_ENABLED: "true",
  TIMELINE_FILTERS_COMPANY: "true", TIMELINE_SECURITY_DEFINER: "true",
  TIMELINE_EXECUTE_AUTHENTICATED: "true", ENTITY_TIMELINE_STILL_PRESENT: "true",
  BRIDGE_PRESENT: "true", COMPOSITE_FKS_VALIDATED: "7", RPC_EXACT_SIGNATURES: "5",
  FEEDBACK_WRITE_PRIVILEGES: "0", FEEDBACK_WRITE_POLICIES: "0",
  ...over,
})

/** The expectations the gate builds at run time from its capture. */
const restoreExpectations = (over = {}) => {
  const o = { relacl: LOCAL_HARDENED_RELACL, fp: LOCAL_HARDENED_FINGERPRINT,
    service: "4", client: "0", pub: "false", ...over }
  return [
    `ACTIVITY_RELACL=${o.relacl}`, `ACTIVITY_ACL_FINGERPRINT=${o.fp}`,
    `ACTIVITY_SERVICE_PRIVILEGES=${o.service}`, `ACTIVITY_CLIENT_PRIVILEGES=${o.client}`,
    `ACTIVITY_SELECT_PUBLIC=${o.pub}`, "ACTIVITY_SELECT_ANON=false",
    "ACTIVITY_SELECT_AUTHENTICATED=false",
  ].join("\n")
}
const restoredSnapshot = (over = {}) => ({
  ACTIVITY_RELACL: LOCAL_HARDENED_RELACL, ACTIVITY_ACL_FINGERPRINT: LOCAL_HARDENED_FINGERPRINT,
  ACTIVITY_SERVICE_PRIVILEGES: "4", ACTIVITY_CLIENT_PRIVILEGES: "0",
  ACTIVITY_SELECT_PUBLIC: "false", ACTIVITY_SELECT_ANON: "false",
  ACTIVITY_SELECT_AUTHENTICATED: "false", ...over,
})

test("the broad fixture is canonical Review PRE: client 16 and service_role 8", () => {
  const expectations = broadExpectations()
  assert.match(expectations, /ACTIVITY_SERVICE_PRIVILEGES=8/, "Review's service_role holds all eight")
  assert.match(expectations, /ACTIVITY_CLIENT_PRIVILEGES=16/)
  assert.equal(runCheck(broadSnapshot(), expectations).green, true)
})

test("the canonical PRE fingerprint and relacl are asserted exactly", () => {
  const source = gate()
  assert.match(source, new RegExp(`CANONICAL_REVIEW_PRE_FINGERPRINT='${CANONICAL_PRE_FINGERPRINT}'`))
  assert.ok(source.includes(CANONICAL_PRE_RELACL), "the exact ACL text must be pinned")
  assert.match(broadExpectations(), /ACTIVITY_ACL_FINGERPRINT=\$CANONICAL_REVIEW_PRE_FINGERPRINT/)
  // Order is part of the text an md5 hashes, so the fixture clears first and
  // grants anon, authenticated, service_role in that order.
  const clear = source.indexOf("revoke all privileges on table public.activity_events from $CLIENT_FACING_GRANTEES")
  const anon = source.indexOf("public.activity_events to anon")
  const auth = source.indexOf("public.activity_events to authenticated")
  const svc = source.indexOf("public.activity_events to service_role")
  assert.ok(clear !== -1 && clear < anon && anon < auth && auth < svc, "clear, then grant in canonical order")
})

test("a broad fixture missing one service_role privilege goes RED", () => {
  const e = broadExpectations()
  assert.equal(runCheck(broadSnapshot({ ACTIVITY_SERVICE_PRIVILEGES: "7" }), e).green, false)
  assert.equal(runCheck(broadSnapshot({ ACTIVITY_SERVICE_PRIVILEGES: "4" }), e).green, false,
    "the local shape must not be mistaken for Review's")
  assert.equal(runCheck(broadSnapshot({ ACTIVITY_CLIENT_PRIVILEGES: "15" }), e).green, false)
})

test("an accidental PUBLIC SELECT in the broad fixture goes RED", () => {
  const result = runCheck(broadSnapshot({ ACTIVITY_SELECT_PUBLIC: "true" }), broadExpectations())
  assert.equal(result.green, false)
  assert.match(result.out, /FAIL \[test\] ACTIVITY_SELECT_PUBLIC/)
})

test("a wrong fingerprint goes RED even when every count is right", () => {
  // The counts and the fingerprint are independent: an ACL built in the wrong
  // order has the right privileges and the wrong text.
  const wrongOrder = "{postgres=arwdDxtm/postgres,service_role=arwdDxtm/postgres,anon=arwdDxtm/postgres,authenticated=arwdDxtm/postgres}"
  const result = runCheck(
    broadSnapshot({ ACTIVITY_ACL_FINGERPRINT: "ffffffffffffffffffffffffffffffff", ACTIVITY_RELACL: wrongOrder }),
    broadExpectations(),
  )
  assert.equal(result.green, false)
  assert.match(result.out, /FAIL \[test\] ACTIVITY_ACL_FINGERPRINT/)
  assert.match(result.out, /FAIL \[test\] ACTIVITY_RELACL/)
})

test("the restored local state is service_role 4, and is compared to the capture", () => {
  const source = gate()
  // Restoration is driven by what was captured, never by a constant.
  assert.match(source, /ORIG_SERVICE=\$\(label ACTIVITY_SERVICE_PRIVILEGES "\$SNAP_ORIGINAL"\)/)
  assert.match(source, /ACTIVITY_SERVICE_PRIVILEGES=\$ORIG_SERVICE/)
  assert.match(source, /ACTIVITY_RELACL=\$ORIG_RELACL/)
  assert.match(source, /ACTIVITY_ACL_FINGERPRINT=\$ORIG_FINGERPRINT/)
  assert.doesNotMatch(source, /ACTIVITY_SERVICE_PRIVILEGES=4/, "4 must never be hard-coded either")
  assert.equal(runCheck(restoredSnapshot(), restoreExpectations()).green, true)
  assert.equal(runCheck(restoredSnapshot({ ACTIVITY_SERVICE_PRIVILEGES: "8" }), restoreExpectations()).green, false,
    "Review's shape left behind locally is a failed restoration")
})

test("a client privilege surviving restoration goes RED", () => {
  const leftBehind = runCheck(
    restoredSnapshot({ ACTIVITY_CLIENT_PRIVILEGES: "1", ACTIVITY_SELECT_ANON: "true" }),
    restoreExpectations(),
  )
  assert.equal(leftBehind.green, false)
  assert.match(leftBehind.out, /FAIL \[test\] ACTIVITY_CLIENT_PRIVILEGES/)
  assert.match(leftBehind.out, /FAIL \[test\] ACTIVITY_SELECT_ANON/)
})

test("a wrong restored fingerprint goes RED", () => {
  const drifted = runCheck(
    restoredSnapshot({ ACTIVITY_ACL_FINGERPRINT: "deadbeefdeadbeefdeadbeefdeadbeef" }),
    restoreExpectations(),
  )
  assert.equal(drifted.green, false)
  assert.match(drifted.out, /FAIL \[test\] ACTIVITY_ACL_FINGERPRINT/)
  // And the relacl text is checked alongside it, so a fingerprint collision
  // alone could not carry a wrong ACL through.
  assert.equal(
    runCheck(restoredSnapshot({ ACTIVITY_RELACL: CANONICAL_PRE_RELACL }), restoreExpectations()).green,
    false,
  )
})

test("the restore script is generated from the capture, not hand-written", () => {
  const source = gate()
  assert.match(source, /psql_local -o "\$RESTORE_SQL"/, "the restore statements are produced by a query")
  assert.match(source, /aclexplode/, "from the ACL that was actually there")
  assert.match(source, /with ordinality/, "replayed in relacl order, because order is part of the text")
  assert.match(source, /order by ord;/, "ordering is an explicit sort key, not a UNION ALL accident")
  assert.match(source, /Refusing to mutate a state I cannot restore/,
    "an uncapturable original must abort before the fixture is built")
  const capture = source.indexOf('snapshot "$SNAP_ORIGINAL"')
  const build = source.indexOf("grant $ALL_TABLE_PRIVILEGES")
  assert.ok(capture !== -1 && capture < build, "capture strictly precedes the first mutation")
})

test("PRE and POST semantics are unchanged by the connection work", () => {
  // The discriminators are the contract. The connection layer moved; these did
  // not, and this test is what keeps a future connection fix from quietly
  // relaxing one of them.
  const pre = readFileSync(prePath, "utf8")
  const post = readFileSync(postPath, "utf8")
  for (const label of [
    "MIGRATION_0128_COUNT", "MIGRATION_0129_COUNT", "ACTIVITY_SELECT_PUBLIC",
    "ACTIVITY_SELECT_ANON", "ACTIVITY_SELECT_AUTHENTICATED", "ACTIVITY_CLIENT_PRIVILEGES",
    "ACTIVITY_ACL_FINGERPRINT", "TIMELINE_FILTERS_COMPANY",
    "BRIDGE_PRESENT", "COMPOSITE_FKS_VALIDATED", "RPC_EXACT_SIGNATURES",
    "FEEDBACK_WRITE_PRIVILEGES", "FEEDBACK_WRITE_POLICIES",
  ]) {
    assert.ok(pre.includes(`'${label}=`), `${label} must remain in the PRE snapshot`)
  }
  assert.match(runner(), /EXPECTED_PRE_ACTIVITY_ACL_FINGERPRINT="46875263bd6598c4534e2df7d1847a5e"/)
  for (const gate of [
    /expect ACTIVITY_CLIENT_PRIVILEGES 0/, /expect ACTIVITY_SELECT_ANON false/,
    /expect ACTIVITY_SELECT_AUTHENTICATED false/, /expect MIGRATION_0129_COUNT 1/,
    /expect TIMELINE_FILTERS_COMPANY true/, /expect FEEDBACK_WRITE_PRIVILEGES 0/,
  ]) {
    assert.match(post, gate, `POST gate ${gate} must survive`)
  }
})

test("credentials are neither printed nor placed in argv", () => {
  const source = runner()
  assert.match(source, /security find-generic-password/)
  assert.doesNotMatch(source, /(echo|printf|say)[^\n]*\$\{?(DB_PASSWORD|PGPASSWORD)/)
  assert.doesNotMatch(source, /postgresql:\/\/postgres:[^@]+@/)
  for (const path of [prePath, postPath]) {
    const verifier = readFileSync(path, "utf8")
    assert.doesNotMatch(verifier, /psql\s+"\$DATABASE_URL"/)
    assert.match(verifier, /psql -h "\$DB_HOST" -p "\$DB_PORT" -U "\$DB_USER" -d "\$DB_NAME"/)
  }
})
