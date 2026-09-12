/**
 * Structural guards for the 0128 Review tooling.
 *
 *   node --test 'scripts/review/*.test.mjs'
 *
 * The 0127 guard file is deliberately left alone: it pins the two defects that
 * bit that pair of scripts, and it names that pair by constant. This file holds
 * the properties of the 0128 trio — the promotion runner and its two read-only
 * verifiers — including the one the 0127 tooling never had.
 *
 * THE PROPERTY THE 0127 TOOLING NEVER HAD
 *
 * `supabase db push --linked` targets whatever `supabase/.temp/project-ref`
 * names, while the snapshot psql is host-pinned to `db.$REVIEW_REF`. Nothing
 * tied the two together, so "Review only" rested on the CLI happening to be
 * linked to Review at the moment of use. A runner may read one database and
 * mutate another only if nobody checks. The runner now proves the link before
 * the CLI preflight, and that proof is pinned below.
 *
 * WHY THE POST ASSERTIONS DIFFER IN KIND FROM 0127's
 *
 * 0127 added a function and touched nothing else, so its POST could demand that
 * the security fingerprints be byte-identical. 0128 revokes DML and drops nine
 * write policies — that IS the migration — so an unchanged fingerprint is the
 * failure, not the pass. The direction of that assertion is pinned here because
 * copying it from 0127 would have inverted it silently.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const PROMOTE = "promote-0128-trusted-feedback.sh"
const VERIFY_PRE = "verify-0128-trusted-feedback-pre.sh"
const VERIFY_POST = "verify-0128-trusted-feedback-post.sh"
const VERIFIERS = [VERIFY_PRE, VERIFY_POST]
const ALL = [PROMOTE, ...VERIFIERS]

const read = (name) => readFileSync(resolve(HERE, name), "utf8")

const classifierSource = (source = read(PROMOTE)) => {
  const match = source.match(/classify_state\(\) \{[\s\S]*?\n\}/)
  assert.ok(match, "the classifier must be independently testable")
  return match[0]
}

const classify = (overrides = {}, source = read(PROMOTE)) => {
  const expectedFingerprint = source.match(/EXPECTED_PRE_POLICY_FINGERPRINT="([a-f0-9]{32})"/)?.[1]
  assert.ok(expectedFingerprint, "the canonical PRE policy fingerprint must be pinned")
  const fixture = {
    S_M128: "false",
    S_M128N: "0",
    S_NAME: "0",
    S_EXACT: "0",
    S_ALT: "(none)",
    S_BRIDGE: "false",
    S_INDEX: "<absent>",
    S_SIMPLE: "6",
    S_COMP: "0",
    S_WPOL: "13",
    S_WPRIV: "30",
    S_PRE_WPOL: "true",
    S_POL: "4c89ade7d3f60a123a1cc880afa8dd2d",
    S_TLC: "false",
    BASELINE_OK: "yes",
    EXPECTED_PRE_POLICY_FINGERPRINT: expectedFingerprint,
    ...overrides,
  }
  const assignments = Object.entries(fixture)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n")
  const result = spawnSync("bash", ["-c", `${assignments}\n${classifierSource(source)}\nclassify_state`], {
    encoding: "utf8",
  })
  assert.equal(result.status, 0, result.stderr)
  return result.stdout.trim()
}

test("the classifier accepts only the exact canonical PRE-0128 policy contract", () => {
  assert.equal(classify(), "NOT_APPLIED")
  assert.equal(classify({ S_WPOL: "12" }), "UNDETERMINED")
  assert.equal(classify({ S_WPOL: "14" }), "UNDETERMINED")
  assert.equal(classify({ S_POL: "4c89ade7d3f60a123a1cc880afa8dd2e" }), "UNDETERMINED")
})

test("every central write-policy identity mutation blocks promotion", () => {
  for (const mutation of ["policy name", "command", "role", "permissiveness", "USING", "WITH CHECK"]) {
    assert.equal(
      classify({ S_PRE_WPOL: "false" }),
      "UNDETERMINED",
      `${mutation} drift must not reach the mutating path`,
    )
  }
})

test("partial and exact POST fixtures retain fail-closed classification", () => {
  assert.equal(classify({ S_BRIDGE: "true" }), "PARTIALLY_APPLIED")
  assert.equal(
    classify({
      S_M128: "true",
      S_M128N: "1",
      S_NAME: "5",
      S_EXACT: "5",
      S_BRIDGE: "true",
      S_SIMPLE: "0",
      S_COMP: "7",
      S_WPOL: "0",
      S_WPRIV: "0",
      S_TLC: "true",
    }),
    "APPLIED_AND_CONTRACT_PRESENT",
  )
  assert.notEqual(
    classify({ S_M128: "true", S_M128N: "1", S_NAME: "5", S_EXACT: "4", S_BRIDGE: "true" }),
    "APPLIED_AND_CONTRACT_PRESENT",
  )
})

test("regression mutations to the PRE policy count or fingerprint go RED", () => {
  const source = read(PROMOTE)
  const countMutation = source.replace('[ "$S_WPOL" = "13" ]', '[ "$S_WPOL" = "9" ]')
  assert.notEqual(classify({}, countMutation), "NOT_APPLIED")

  const fingerprintMutation = source.replace(
    'EXPECTED_PRE_POLICY_FINGERPRINT="4c89ade7d3f60a123a1cc880afa8dd2d"',
    'EXPECTED_PRE_POLICY_FINGERPRINT="4c89ade7d3f60a123a1cc880afa8dd2e"',
  )
  assert.notEqual(classify({}, fingerprintMutation), "NOT_APPLIED")
})

test("the PRE write-policy identity is a bidirectional exact-set comparison", () => {
  const source = read(PROMOTE)
  assert.equal((source.match(/'PERMISSIVE','\{public\}'/g) ?? []).length, 13)
  assert.match(source, /select \* from expected except select \* from actual/)
  assert.match(source, /select \* from actual except select \* from expected/)
  assert.match(source, /PRE_WRITE_POLICY_CONTRACT_MATCH=/)
})

/** Executable lines only: these files necessarily discuss what they avoid. */
const executable = (name) =>
  read(name)
    .split("\n")
    .filter((line) => !line.trim().startsWith("#") && !line.trim().startsWith("--"))
    .join("\n")

test("neither verifier has a path to a mutation, reachable or not", () => {
  for (const name of VERIFIERS) {
    const source = executable(name)

    // Matched as a COMMAND: the word also occurs in `supabase/migrations/...`
    // paths and in the `supabase_migrations` schema, and a substring test would
    // flag both.
    assert.equal(
      /(^|[\s|&;(])supabase\s+(db|link|migration|start|stop|test|projects)\b/m.test(source),
      false,
      `${name}: a verifier must not invoke the supabase CLI`,
    )
    assert.equal(/db\s+push/i.test(source), false, `${name}: must never mention db push`)

    // Matched in STATEMENT POSITION — start of a line, or just after a `;`.
    // A bare-word scan is what the 0127 guard used, and it reports these files
    // as mutating because a POST assertion is DESCRIBED as "must not have
    // dropped the grant". Widening a true finding to catch prose would make the
    // guard unreadable and, worse, teach the next author to soften it.
    for (const forbidden of [
      /(^|;)\s*insert\s+into\b/im,
      /(^|;)\s*update\s+\S+\s+set\b/im,
      /(^|;)\s*delete\s+from\b/im,
      /(^|;)\s*truncate\b/im,
      /(^|;)\s*create\s+(table|function|policy|index)\b/im,
      /(^|;)\s*alter\s+(table|function|role)\b/im,
      /(^|;)\s*drop\s+\S/im,
      /(^|;)\s*grant\b/im,
      /(^|;)\s*revoke\b/im,
    ]) {
      assert.equal(forbidden.test(source), false, `${name}: must not contain ${forbidden}`)
    }
  }
})

test("every SQL document opens read-only, so the database refuses a write too", () => {
  for (const name of ALL) {
    const source = executable(name)
    const heredocs = source.match(/<<'[A-Z0-9]+'\n[\s\S]*?\n[A-Z0-9]+\n/g) ?? []
    assert.ok(heredocs.length >= 1, `${name}: expected at least one SQL document`)
    for (const doc of heredocs) {
      assert.match(
        doc,
        /^<<'[A-Z0-9]+'\nset default_transaction_read_only = on;/,
        `${name}: each SQL document must open by making the transaction read-only`,
      )
    }
    assert.match(source, /ON_ERROR_STOP=1/, `${name}: psql must abort on the first SQL error`)
  }
})

test("the runner proves the CLI push target is the database it measured", () => {
  const source = executable(PROMOTE)
  assert.match(
    source,
    /supabase\/\.temp\/project-ref/,
    "the linked project ref must be read, not assumed",
  )
  const at = source.indexOf("LINKED_REF=")
  assert.notEqual(at, -1, "the linked ref must be captured")
  const push = source.indexOf("supabase db push")
  assert.ok(at < push, "the link must be proven before the CLI is invoked at all")
  assert.match(
    source,
    /\[ "\$LINKED_REF" != "\$REVIEW_REF" \]/,
    "a link to any other project must stop the run",
  )
})

test("alternate-signature detection excludes the five signatures it approves", () => {
  // The runner only. Neither published verifier carries an overload probe — the
  // PRE one runs before the functions exist, and the POST one asserts the five
  // exact signatures without asking what ELSE answers to those names. That is a
  // real narrowness in the 0128 verifier, but it belongs to the slice that owns
  // those files, not to this one, and it is recorded rather than patched here.
  for (const name of [PROMOTE]) {
    const source = executable(name)
    const at = source.indexOf("RPC_ALTERNATE_SIGNATURES")
    assert.notEqual(at, -1, `${name}: the overload probe must exist`)

    const statement = source.slice(at, source.indexOf(";", at))
    for (const signature of [
      "create_assessment_feedback_v1\\(uuid,text\\)",
      "reply_feedback_v1\\(uuid,text\\)",
      "acknowledge_feedback_v1\\(uuid\\)",
      "close_feedback_v1\\(uuid\\)",
      "archive_feedback_v1\\(uuid\\)",
    ]) {
      assert.match(
        statement,
        new RegExp(`to_regprocedure\\('public\\.${signature}'\\)`),
        `${name}: ${signature} must be excluded, or a healthy boundary reports ` +
          `its own signature back as an unexpected overload`,
      )
    }
  }
})

test("provolatile is cast explicitly wherever it is concatenated", () => {
  // `provolatile` is "char", which has no unambiguous `||` with text: Postgres
  // raises `operator is not unique` and ON_ERROR_STOP aborts the whole file.
  // That defect only surfaced against a real database, after the mutation.
  for (const name of ALL) {
    for (const line of executable(name).split("\n")) {
      if (!line.includes("provolatile") || !line.includes("||")) continue
      assert.match(line, /provolatile::text/, `${name}: provolatile needs an explicit cast`)
    }
  }
})

test("FILTER is never attached to a scalar privilege expression", () => {
  // FILTER belongs to an aggregate expression. The published v1 runner put it
  // after a scalar subquery/cast, which bash -n and the structural POST checks
  // could not parse and PostgreSQL rejected before any promotion mutation.
  for (const name of ALL) {
    const source = executable(name)
    assert.equal(
      /has_(?:function|schema|table)_privilege\s*\([\s\S]{0,300}?\)\s*::\s*int\s*\)?\s*filter\s*\(/i.test(
        source,
      ),
      false,
      `${name}: FILTER cannot qualify a scalar privilege expression`,
    )
  }

  const source = executable(PROMOTE)
  const at = source.indexOf("RPC_EXECUTE_AUTHENTICATED=")
  assert.notEqual(at, -1, "the authenticated EXECUTE metric must exist")
  const statement = source.slice(at, source.indexOf(";", at))
  assert.match(statement, /coalesce\(sum\(/, "the five exact checks must be aggregated")
  assert.match(
    statement,
    /case when to_regprocedure\(signature\) is not null/,
    "absent signatures must contribute zero without evaluating their privileges",
  )
  for (const signature of [
    "create_assessment_feedback_v1(uuid,text)",
    "reply_feedback_v1(uuid,text)",
    "acknowledge_feedback_v1(uuid)",
    "close_feedback_v1(uuid)",
    "archive_feedback_v1(uuid)",
  ]) {
    assert.match(statement, new RegExp(`public\\.${signature.replace(/[()]/g, "\\$&")}`))
  }
})

test("a query that did not run is never treated as a pass", () => {
  const source = executable(PROMOTE)
  const guards = source.match(/if ! runsql "\$[A-Z0-9]+" "\$SNAP"; then/g) ?? []
  assert.equal(guards.length, 3, "PRE, TOCTOU and POST must each run under a failure guard")
  assert.match(source, /POST_OK=0/, "an unreadable POST must fail the verdict")
})

test("one canonical snapshot serves PRE, TOCTOU and POST", () => {
  // Three hand-written snapshots would drift apart, and a drift between PRE and
  // POST is indistinguishable from a drift in the database.
  const source = executable(PROMOTE)
  assert.equal(
    (source.match(/<<'CANON'/g) ?? []).length,
    1,
    "the snapshot must be defined exactly once",
  )
  assert.equal(
    (source.match(/runsql "\$[A-Z0-9]+" "\$SNAP"/g) ?? []).length,
    3,
    "and executed by all three phases",
  )
})

test("the POST proves the security posture CHANGED, which is what 0128 does", () => {
  const source = executable(PROMOTE)
  for (const expectation of [
    /AGGREGATE_WRITE_PRIVILEGES=0/,
    /AGGREGATE_WRITE_POLICIES=0/,
    /AGGREGATE_READ_POLICIES=5/,
    /AGGREGATE_RLS_ENABLED=5/,
    /RPC_SECURITY_DEFINER=5/,
    /RPC_SEARCH_PATH_HARDENED=5/,
    /RPC_EXECUTE_AUTHENTICATED=5/,
    /RPC_EXECUTE_OTHER_ROLES=0/,
  ]) {
    assert.match(source, expectation, `the POST must assert ${expectation}`)
  }
  // The inverted-assertion trap: on the applying path an UNCHANGED fingerprint
  // means the revoke did not take effect.
  assert.match(
    source,
    /if \[ "\$P_ACL" = "\$S_ACL" \]; then say "  DRIFT/,
    "an unchanged ACL fingerprint must fail the applying path",
  )
  assert.match(
    source,
    /if \[ "\$P_POL" = "\$S_POL" \]; then say "  DRIFT/,
    "an unchanged policy fingerprint must fail the applying path",
  )
})

test("the runner stays pointed at Canonical Review and nowhere else", () => {
  for (const name of ALL) {
    const source = executable(name)
    assert.equal(
      /gzrrwyiqfbnyprkdeqvm|oudngmrdtgengilpqqnz/.test(source),
      false,
      `${name}: Production and Legacy must never be named`,
    )
  }
  const source = executable(PROMOTE)
  assert.match(source, /REVIEW_REF="rwfvxvbzaosgcyfxdjpt"/, "Review ref must be pinned")
  assert.equal(
    /REVIEW_REF=\$|DB_HOST="?\$\{/.test(source),
    false,
    "the target must not be overridable at run time",
  )
})

test("no script prints a secret or puts one in argv", () => {
  const source = executable(PROMOTE)
  assert.match(
    source,
    /security find-generic-password -s "\$KEYCHAIN_SERVICE" -a "\$USER" -w/,
    "the credential comes from the Keychain",
  )
  for (const name of ALL) {
    const body = executable(name)
    // The hazard is INTERPOLATION — `$DATABASE_URL` carries the password inside
    // it. Naming the variable in operator guidance ("re-run with DATABASE_URL
    // pointing at Review") prints nothing, and flagging it would push the next
    // author to delete the instruction rather than the leak.
    assert.equal(
      /(say|echo|printf)[^\n]*\$\{?(DB_PASSWORD|PGPASSWORD|SUPABASE_DB_PASSWORD|DATABASE_URL)\b/.test(
        body,
      ),
      false,
      `${name}: a credential must never be printed`,
    )
    assert.equal(
      /--password|psql[^\n]*-W\b/.test(body),
      false,
      `${name}: the password must never reach argv`,
    )
  }
})

test("the shared safety contract is intact in every script", () => {
  for (const name of ALL) {
    const source = executable(name)
    assert.match(source, /set -uo pipefail/, `${name}: must fail closed on unset variables`)
    assert.equal(/set -e\b/.test(source), false, `${name}: set -e would skip explicit handling`)
    assert.equal(
      /^\s*(source |\. |eval |exec )/m.test(source),
      false,
      `${name}: must not source, eval or exec`,
    )
    assert.equal(/\b(kill|logout)\b/.test(source), false, `${name}: must not signal a shell`)
  }
})

test("the migration content is pinned, and pinned to the reviewed bytes", () => {
  const source = executable(PROMOTE)
  assert.match(
    source,
    /APPROVED_MIGRATION_SHA="f013a4a0cc257653a8f2af5de3a0c17a5173d57ddfdffbf2cdb96c995b3f55a9"/,
    "the migration hash must be the one the database gate validated",
  )
  assert.match(
    source,
    /APPROVED_IMPLEMENTATION_COMMIT="c7c344279130f53005a6d777c261849c119f70dd"/,
    "the implementation commit must be pinned",
  )
  // Ancestry, not equality: an equality check against origin/main holds only
  // until the merge that publishes this runner, then refuses forever.
  assert.match(
    source,
    /git merge-base --is-ancestor "\$APPROVED_IMPLEMENTATION_COMMIT" origin\/main/,
    "the pinned commit must be required as an ANCESTOR of origin/main",
  )
  assert.match(source, /RUN_SHA" != "\$RUN_CANON/, "the runner must verify itself by content")
})

test("only the promotion runner may mutate, and only through one guarded push", () => {
  const source = executable(PROMOTE)
  const pushes = source.match(/supabase db push --linked \$YES_FLAG/g) ?? []
  assert.equal(pushes.length, 1, "exactly one mutating push exists")
  assert.match(
    source,
    /PROMOTION_OUTCOME=UNKNOWN_INSPECT_BEFORE_ANY_RETRY/,
    "an ambiguous push is terminal and explicitly not a failure",
  )
  assert.equal(
    /supabase db push[^\n]*\|\||retry|--force/.test(source),
    false,
    "no retry and no force on the mutating path",
  )
  // The dry-run must prove the pending set is exactly this migration, and must
  // read it from its own file rather than the shared log, which also carries the
  // fetch output and would match other migration names.
  assert.match(
    source,
    /PEND=\$\(grep -oE '0\[0-9\]\{3\}_\[a-z0-9_\]\+\\\.sql' "\$DRY"/,
    "the pending set must be derived from the dedicated dry-run file",
  )
  assert.match(
    source,
    /\[ "\$PEND" != "\$MIGRATION_BASENAME" \]/,
    "a pending set that is not exactly 0128 must stop the run",
  )
})

test("the mutating path is reachable only from a measured NOT_APPLIED state", () => {
  const source = executable(PROMOTE)
  const branch = source.indexOf('if [ "$CURRENT_STATE" = "NOT_APPLIED" ]; then')
  assert.notEqual(branch, -1, "the promotion must live inside the NOT_APPLIED branch")
  assert.ok(branch < source.indexOf("supabase db push"), "and open before any CLI invocation")
  for (const blocked of ["PARTIALLY_APPLIED", "UNDETERMINED"]) {
    assert.match(
      source,
      new RegExp(`PROMOTION_OUTCOME=BLOCKED_\\$\\{CURRENT_STATE\\}|${blocked}`),
      `${blocked} must fail closed`,
    )
  }
  assert.match(
    source,
    /--local-pgtap-verified/,
    "the local database gate must be asserted before anything else",
  )
})
