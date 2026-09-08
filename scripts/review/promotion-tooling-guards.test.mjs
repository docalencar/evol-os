/**
 * Structural guards for the 0127 Review tooling — RUNNER ONLY.
 *
 *   node --test 'scripts/review/*.test.mjs'
 *
 * The glob is deliberate: `node --test scripts/review/` resolves the directory
 * as a module and fails before running anything.
 *
 * These scripts talk to a real, already-promoted database. Two of their defects
 * only appeared at the moment they were used, after the mutation they were
 * meant to verify had already happened:
 *
 *   * `' VOLATILITY=' || p.provolatile` — `provolatile` is `"char"`, which has
 *     no unambiguous `||` with text, so Postgres raised `operator is not unique`
 *     and ON_ERROR_STOP aborted the entire POST file;
 *   * `RPC_ALTERNATE_SIGNATURES` aggregated every function of that name,
 *     including the approved one, so a healthy boundary reported its own
 *     signature back as an unexpected overload.
 *
 * Both are the kind of thing a shell syntax check cannot see and a human reading
 * SQL skims past. They are pinned here so they cannot come back, along with the
 * structural property that matters most: the verifier has no path to a mutation.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const PROMOTE = "promote-0127-assessment-snapshot-pressure.sh"
const VERIFY = "verify-0127-assessment-snapshot-pressure-post.sh"

const read = (name) => readFileSync(resolve(HERE, name), "utf8")

/** Executable lines only: these files necessarily discuss what they avoid. */
const executable = (name) =>
  read(name)
    .split("\n")
    .filter((line) => !line.trim().startsWith("#") && !line.trim().startsWith("--"))
    .join("\n")

test("the read-only verifier has no path to a mutation, reachable or not", () => {
  const source = executable(VERIFY)

  // Not "does not reach db push under some condition" — cannot reach it, because
  // the CLI is never invoked. Matched as a COMMAND: the word also occurs
  // legitimately in `supabase/migrations/...` paths and in the
  // `supabase_migrations` schema, and a substring test would flag both.
  assert.equal(
    /(^|[\s|&;(])supabase\s+(db|link|migration|start|stop|test|projects)\b/m.test(source),
    false,
    "the verifier must not invoke the supabase CLI",
  )
  assert.equal(/db\s+push/i.test(source), false, "the verifier must never mention db push")

  for (const forbidden of [
    /\binsert\s+into\b/i,
    /\bupdate\s+\S+\s+set\b/i,
    /\bdelete\s+from\b/i,
    /\btruncate\b/i,
    /\bcreate\s+(table|function|policy|index)\b/i,
    /\balter\s+(table|function|role)\b/i,
    /\bdrop\s+\S/i,
    /\bgrant\b/i,
    /\brevoke\b/i,
  ]) {
    assert.equal(forbidden.test(source), false, `the verifier must not contain ${forbidden}`)
  }
})

test("the database itself refuses a write from the verifier", () => {
  // Belt and braces: every SQL file it feeds psql opens read-only, so a write
  // would be rejected by Postgres even if one were introduced here.
  const source = executable(VERIFY)
  const heredocs = source.match(/<<'[A-Z0-9]+'\n[\s\S]*?\n[A-Z0-9]+\n/g) ?? []
  assert.ok(heredocs.length >= 2, "expected the state and contract SQL documents")
  for (const doc of heredocs) {
    assert.match(
      doc,
      /^<<'[A-Z0-9]+'\nset default_transaction_read_only = on;/,
      "each SQL document must open by making the transaction read-only",
    )
  }
})

test("provolatile is cast explicitly wherever it is concatenated", () => {
  for (const name of [PROMOTE, VERIFY]) {
    const source = executable(name)
    for (const line of source.split("\n")) {
      if (!line.includes("provolatile")) continue
      if (!line.includes("||")) continue
      assert.match(
        line,
        /provolatile::text/,
        `${name}: provolatile is "char" and needs an explicit cast before ||`,
      )
    }
  }
})

test("alternate-signature detection excludes the signature it approves", () => {
  for (const [name, fn] of [
    [PROMOTE, "get_company_assessment_snapshot_pressure_v1"],
    [VERIFY, "get_company_assessment_snapshot_pressure_v1"],
  ]) {
    const source = executable(name)
    const at = source.indexOf("RPC_ALTERNATE_SIGNATURES")
    assert.notEqual(at, -1, `${name}: the overload probe must exist`)

    // The statement runs from the label to its terminating semicolon.
    const statement = source.slice(at, source.indexOf(";", at))
    assert.match(
      statement,
      new RegExp(`oid is distinct from to_regprocedure\\('public\\.${fn}\\(uuid\\)'\\)`),
      `${name}: the canonical signature must be excluded, or a healthy boundary ` +
        `reports itself as an overload`,
    )
  }
})

test("a query that did not run is never treated as a pass", () => {
  const source = executable(VERIFY)

  // Both psql invocations are guarded, and each failure branch declares FAIL
  // rather than continuing into the assertions with an empty output file.
  const guards = source.match(/if ! runsql "\$Q\d\.out" "\$Q\d"; then/g) ?? []
  assert.equal(guards.length, 2, "both SQL documents must be run under a failure guard")
  assert.equal(
    (source.match(/VERIFY_VERDICT=FAIL/g) ?? []).length >= 3,
    true,
    "every failure path must state the verdict",
  )
  assert.match(source, /ON_ERROR_STOP=1/, "psql must abort on the first SQL error")
})

test("both scripts stay pointed at Canonical Review and nowhere else", () => {
  for (const name of [PROMOTE, VERIFY]) {
    const source = executable(name)
    assert.match(source, /REVIEW_REF="rwfvxvbzaosgcyfxdjpt"/, `${name}: Review ref must be pinned`)
    assert.equal(
      /gzrrwyiqfbnyprkdeqvm|oudngmrdtgengilpqqnz/.test(source),
      false,
      `${name}: Production and Legacy must never be named`,
    )
    // No env or argv override of the target.
    assert.equal(
      /REVIEW_REF=\$|DB_HOST="?\$\{/.test(source),
      false,
      `${name}: the target must not be overridable at run time`,
    )
  }
})

test("neither script prints a secret or puts one in argv", () => {
  for (const name of [PROMOTE, VERIFY]) {
    const source = executable(name)
    assert.match(
      source,
      /security find-generic-password -s "\$KEYCHAIN_SERVICE" -a "\$USER" -w/,
      `${name}: the credential comes from the Keychain`,
    )
    assert.equal(
      /(say|echo|printf)[^\n]*DB_PASSWORD/.test(source),
      false,
      `${name}: the password must never be printed`,
    )
    assert.equal(
      /--password|psql[^\n]*-W\b/.test(source),
      false,
      `${name}: the password must never reach argv`,
    )
  }
})

test("the shared safety contract is intact in both scripts", () => {
  for (const name of [PROMOTE, VERIFY]) {
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

test("only the promotion runner may mutate, and only through one guarded push", () => {
  const source = executable(PROMOTE)
  const pushes = source.match(/supabase db push --linked \$YES_FLAG/g) ?? []
  assert.equal(pushes.length, 1, "exactly one mutating push exists")
  assert.match(source, /PROMOTION_OUTCOME=PUSH_UNKNOWN/, "an ambiguous push is terminal")
  assert.equal(
    /supabase db push[^\n]*\|\||retry|--force/.test(source),
    false,
    "no retry and no force on the mutating path",
  )
})
