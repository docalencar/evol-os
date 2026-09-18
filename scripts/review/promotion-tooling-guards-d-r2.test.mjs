/**
 * Structural guards for the D-R2 Review promotion tooling (migration 0133).
 *
 *   node --test 'scripts/review/*.test.mjs'
 *
 * The glob is deliberate: `node --test scripts/review/` resolves the directory as
 * a module and fails before running anything.
 *
 * These guards pin the properties that make a mutation-capable script safe to
 * hand a Review credential — identity binding, ordering, single mutation, no
 * retry, no arbitrary SQL, secret hygiene. They cannot prove the SQL is valid;
 * only a server can, which is what run-d-r2-local-db-gate.sh is for.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (name) => readFileSync(resolve(HERE, name), "utf8")

const PROMOTE = "promote-d-r2-development-origin.sh"
const PRE = "verify-d-r2-development-origin-pre.sh"
const POST = "verify-d-r2-development-origin-post.sh"
const GATE = "run-d-r2-local-db-gate.sh"

const runner = read(PROMOTE)
const pre = read(PRE)
const post = read(POST)
const gate = read(GATE)

/** Executable lines only: these files necessarily discuss what they avoid. */
const executable = (source) =>
  source
    .split("\n")
    .filter((line) => !line.trim().startsWith("#") && !line.trim().startsWith("--"))
    .join("\n")

/**
 * Mutation-verb scanning, with single-word quoted literals removed first.
 *
 * `has_table_privilege` probes enumerate privilege NAMES —
 * `array['select','insert','update','delete','truncate',...]` — and a naive scan
 * reads those as the statements they are named after. They are not: asking
 * whether a role holds TRUNCATE is a read.
 *
 * Only literals with no whitespace are removed, so a real statement smuggled into
 * a quoted string ('insert into x values(1)') still has whitespace, still
 * survives, and is still caught.
 */
const withoutIdentifierLiterals = (source) => source.replace(/'[^'\s]*'/g, "''")

const SOURCE_COMMIT = "ef36ac130c8b655e0635102a9a6d89c45e483b4b"
const MIGRATION_SHA = "2791febff1b790712ffe60f13cf9e8227427c498b8310fcaf2f91977899509eb"
const FUNCTION = "get_authorized_development_plan_origins_v1"

test("the mutation identity is pinned: Review, source commit, migration hash", () => {
  assert.match(runner, /REVIEW_REF="rwfvxvbzaosgcyfxdjpt"/)
  assert.match(runner, new RegExp(`SOURCE_COMMIT="${SOURCE_COMMIT}"`))
  assert.match(runner, new RegExp(`S133="${MIGRATION_SHA}"`))
  // A filename alone is not an identity: the hash is re-checked, not just read.
  assert.match(runner, /shasum -a 256 "\$M133"[\s\S]{0,200}migration hash mismatch/)
})

test("the payload is exactly one named migration, never arbitrary SQL", () => {
  assert.match(
    runner,
    /EXPECTED_PENDING='0133_create_development_plan_origin_read_boundary\.sql'/,
  )
  // No second migration is referenced, and there is no generic executor path:
  // no -f/-c carrying SQL, no heredoc of DDL, in the runner.
  const source = withoutIdentifierLiterals(executable(runner))
  assert.equal(
    /M13[0-24-9]=/.test(source),
    false,
    "the runner must name 0133 and no other migration",
  )
  for (const forbidden of [
    /\bcreate\s+(table|function|policy|index)\b/i,
    /\balter\s+(table|function|role)\b/i,
    /\bdrop\s+\S/i,
    /\bgrant\b/i,
    /\brevoke\b/i,
    /\binsert\s+into\b/i,
    /\bupdate\s+\S+\s+set\b/i,
    /\bdelete\s+from\b/i,
  ]) {
    assert.equal(forbidden.test(source), false, `the runner must not contain ${forbidden}`)
  }
})

test("both verifiers are forced read-only and cannot reach a mutation", () => {
  for (const [name, source] of [[PRE, pre], [POST, post]]) {
    assert.match(source, /set default_transaction_read_only = on;/, `${name} must open read-only`)
    const code = withoutIdentifierLiterals(executable(source))
    assert.equal(
      /(^|[\s|&;(])supabase\s+(db|link|migration|start|stop|test|projects)\b/m.test(code),
      false,
      `${name} must not invoke the supabase CLI`,
    )
    assert.equal(/db\s+push/i.test(code), false, `${name} must never mention db push`)
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
      assert.equal(forbidden.test(code), false, `${name} must not contain ${forbidden}`)
    }
  }
})

test("every SQL document the verifiers feed psql opens read-only", () => {
  for (const [name, source] of [[PRE, pre], [POST, post]]) {
    const heredocs = executable(source).match(/<<'[A-Z0-9]+'\n[\s\S]*?\nSQL\n/g) ?? []
    assert.ok(heredocs.length >= 1, `${name}: expected at least one SQL document`)
    for (const doc of heredocs) {
      assert.match(
        doc,
        /^<<'[A-Z0-9]+'\nset default_transaction_read_only = on;/,
        `${name}: each SQL document must open by making the transaction read-only`,
      )
    }
  }
})

test("provolatile is cast explicitly wherever it is concatenated", () => {
  // 0127 shipped a POST verifier that aborted on `operator is not unique` because
  // provolatile is "char". It cost a promotion. It does not come back.
  for (const [name, source] of [[PRE, pre], [POST, post], [PROMOTE, runner]]) {
    for (const line of executable(source).split("\n")) {
      if (!line.includes("provolatile") || !line.includes("||")) continue
      assert.match(line, /provolatile::text/, `${name}: provolatile needs an explicit cast before ||`)
    }
  }
})

test("the overload probe excludes the signature it approves", () => {
  const at = post.indexOf("ORIGIN_ALTERNATE_SIGNATURES")
  assert.notEqual(at, -1, "the overload probe must exist")
  const statement = post.slice(at, post.indexOf(";", at))
  assert.match(
    statement,
    new RegExp(`oid is distinct from to_regprocedure\\('public\\.${FUNCTION}\\(uuid,uuid\\)'\\)`),
    "the canonical signature must be excluded, or a healthy boundary reports itself as an overload",
  )
})

test("function absence is proven by name, not by one signature lookup", () => {
  // An unexpected overload would leave a signature probe reporting "absent" while
  // the name is in fact taken, which makes migration history alone misleading.
  assert.match(pre, /ORIGIN_NAMECOUNT.*count\(\*\)/s)
  assert.match(runner, /ORIGIN_NAMECOUNT=0/)
  assert.match(runner, /ORIGIN_SIGNATURE_PRESENT=false/)
})

test("tooling must be canonical main before any connection or mutation", () => {
  const canonical = runner.indexOf("tooling is not canonical origin/main")
  const connect = runner.indexOf("select 1")
  const mutate = runner.indexOf("PROMOTION_ATTEMPT=BEGIN")
  assert.ok(canonical > 0 && canonical < connect && connect < mutate,
    "canonical-tooling check must precede connection, which must precede mutation")
  // The credential is not even read until the source identity is settled.
  assert.ok(canonical < runner.indexOf("find-generic-password"))
})

test("PRE, TOCTOU and payload re-check all gate the single mutation", () => {
  assert.match(runner, /cmp -s "\$PRE" "\$TOCTOU"/)
  assert.match(runner, /NOT_ATTEMPTED_TOCTOU_DRIFT/)
  assert.match(runner, /NOT_ATTEMPTED_TOCTOU_PAYLOAD_DRIFT/)
  assert.match(runner, /NOT_ATTEMPTED_TOCTOU_SOURCE_DRIFT/)
  assert.match(runner, /NOT_ATTEMPTED_MIGRATION_HISTORY_DRIFT/)
  assert.match(runner, /NOT_ATTEMPTED_PRE_DRIFT/)
  const toctou = runner.indexOf('cmp -s "$PRE" "$TOCTOU"')
  assert.ok(toctou > 0 && toctou < runner.indexOf("PROMOTION_ATTEMPT=BEGIN"))
})

test("0133 already applied is refused before any mutation", () => {
  assert.match(runner, /MIGRATION_0133_COUNT=0/)
  assert.match(runner, /MIGRATIONS_AFTER_0132=0/)
})

test("exactly one mutation, and an ambiguous outcome is never retried", () => {
  // One invocation site, whichever transport it resolves to.
  assert.equal((runner.match(/run_mutating_push <\/dev\/null/g) ?? []).length, 1)

  // Inside that function: exactly two pushes — the two transports — and each one
  // is non-interactive. Anything else is a second mutation path.
  const body = runner.slice(
    runner.indexOf("run_mutating_push(){"),
    runner.indexOf("if ! run_mutating_push"),
  )
  const pushes = body.match(/supabase db push[^\n;]*/g) ?? []
  assert.equal(pushes.length, 2, "exactly two transports for one mutation")
  for (const push of pushes) {
    assert.match(push, /--yes/, "each transport must be non-interactive")
    assert.doesNotMatch(push, /--dry-run/, "the mutating push is not a dry run")
  }
  assert.match(runner, /UNKNOWN_REMOTE_OUTCOME_INSPECT_BEFORE_RETRY/)
  // The ambiguous branch must exit, not fall through into a second attempt.
  const unknown = runner.indexOf("UNKNOWN_REMOTE_OUTCOME_INSPECT_BEFORE_RETRY")
  assert.match(runner.slice(unknown, unknown + 700), /exit 2/)
  // ...and it must direct the operator to a READ-ONLY next step — the POST
  // verifier, named through the variable that is bound to it, not a second push.
  const guidance = runner.slice(unknown, unknown + 700)
  assert.match(guidance, /\$POST_RUNNER/)
  assert.match(runner, new RegExp(`POST_RUNNER="scripts/review/${POST}"`))
  assert.doesNotMatch(guidance, /db push/)
  assert.match(guidance, /PARTIAL_REMOTE_APPLICATION/)
})

test("POST proves the exact function contract, not an approximation", () => {
  assert.match(post, /expect ORIGIN_NAMECOUNT 1/)
  assert.match(post, /expect ORIGIN_ALTERNATE_SIGNATURES 0/)
  assert.match(post, /expect ORIGIN_SECURITY_DEFINER true/)
  assert.match(post, /expect ORIGIN_VOLATILITY s/)
  assert.match(post, /expect ORIGIN_SEARCH_PATH_FIXED true/)
  assert.match(post, /expect ORIGIN_OWNER_IS_CURRENT true/)
  assert.match(post, /expect ORIGIN_AUTHENTICATED_EXECUTE true/)
  assert.match(post, /expect ORIGIN_FORBIDDEN_EXECUTE_GRANTS 0/)
  assert.match(post, /expect MIGRATION_0133_COUNT 1/)
  assert.match(post, /expect MIGRATIONS_AFTER_0133 0/)
  assert.match(post, /expect RETENTION_FOUR_RELATIONS 4/)
  // The five approved columns, in order, as the catalog renders them.
  assert.match(
    post,
    /expect ORIGIN_RESULT 'TABLE\(plan_id uuid, template_id uuid, template_version_id uuid, template_name text, template_version_number integer\)'/,
  )
  // The reader must not have acquired a template-table dependency.
  assert.match(post, /expect ORIGIN_TEMPLATE_TABLE_REFERENCES 0/)
})

test("POST fails closed when its own query does not run", () => {
  // An empty output file must never be read as a set of passing values.
  assert.match(post, /if ! "\$\{psql_cmd\[@\]\}" >"\$OUT"/)
  assert.match(post, /POST state query did not run/)
  assert.match(post, /ON_ERROR_STOP=1/)
  assert.ok((post.match(/D_R2_POST=FAIL/g) ?? []).length >= 2,
    "every failure path must state the verdict")
})

test("the pre-existing ledger privacy finding is preserved, never repaired here", () => {
  // 0133 is function-only. If any ledger ACL, RLS or policy fingerprint moved,
  // something other than 0133 was applied — widening OR hardening both fail.
  for (const key of [
    "LEDGER_ACL_FINGERPRINT",
    "LEDGER_RLS_FINGERPRINT",
    "DEVELOPMENT_POLICY_FINGERPRINT",
    "DEVELOPMENT_RLS_FINGERPRINT",
    "DEVELOPMENT_ACL_FINGERPRINT",
  ]) {
    assert.match(pre, new RegExp(key), `PRE must record ${key}`)
    assert.match(post, new RegExp(key), `POST must re-read ${key}`)
    assert.match(post, new RegExp(`fingerprint_unchanged ${key}`), `POST must compare ${key}`)
  }
  assert.match(runner, /PRE_EXISTING_LEDGER_PRIVACY_FINDING=OPEN_UNCHANGED/)
})

test("no script prints a secret or puts one in argv", () => {
  for (const [name, source] of [[PROMOTE, runner], [PRE, pre], [POST, post], [GATE, gate]]) {
    const code = executable(source)
    // The URL and password are never echoed. Structure is reported as booleans.
    assert.equal(/\becho\b.*\$(URL|P_PASS|PGPASSWORD)\b/.test(code), false,
      `${name} must not echo a credential`)
    assert.equal(/\bsay\b.*"\$(URL|P_PASS|PGPASSWORD)/.test(code), false,
      `${name} must not print a credential`)
    // No literal secret may be committed.
    assert.equal(/postgres(ql)?:\/\/[^\s"']*:[^\s"'@]+@/.test(code), false,
      `${name} must not contain a literal connection string with credentials`)
  }
  assert.match(runner, /SECRET_PRESENT=true/)
  assert.match(runner, /PROJECT_REF_MATCH=true/)
  // psql receives the password through the environment, never as an argument.
  assert.equal(/psql[^\n]*--password[^\n]*\$/.test(executable(runner)), false)
})

test("the runner reads the credential only from Keychain or a named env var", () => {
  assert.match(runner, /URL_KEYCHAIN_SERVICE="evol-os-review-pooler-url"/)
  assert.match(runner, /security find-generic-password -s "\$URL_KEYCHAIN_SERVICE" -a "\$USER" -w/)
  assert.match(runner, /URL="\$\{D_R2_REVIEW_DB_URL:-\}"/)
})

test("the target must be canonical Review and never a loopback database", () => {
  assert.match(runner, /IS_LOOPBACK\)" = false/)
  assert.match(runner, /postgres\.\$REVIEW_REF/)
  assert.match(runner, /POOLER_HOST_SUFFIX=".pooler.supabase.com"/)
  assert.match(runner, /sslmode=disable/)  // ...rejected, see NOT_ATTEMPTED_TARGET_INVALID
  assert.match(runner, /supabase\/\.temp\/project-ref/)
})

test("the local gate is loopback-only and never reads a Review credential", () => {
  const code = executable(gate)
  assert.match(code, /DB_HOST=\$\{DB_HOST:-127\.0\.0\.1\}/)
  assert.match(code, /this gate runs against the LOCAL database only/)
  assert.equal(/find-generic-password/.test(code), false,
    "the local gate must never read the Keychain")
  assert.equal(/pooler\.supabase\.com/.test(code), false,
    "the local gate must never reference the Review pooler")
  assert.match(code, /REVIEW_ACCESSED=NO/)
  assert.match(code, /REVIEW_DB_0133=NOT_APPLIED/)
})

test("the read-only proof runs in the verifier's own context, not a fresh session", () => {
  // The first version of this proof opened a NEW psql process and ran
  //   -c "set default_transaction_read_only = on; create table ..."
  // which was wrong twice: a new connection does not inherit another
  // connection's session GUC, and psql runs a multi-statement -c string in ONE
  // implicit transaction, whose read-only flag was already fixed at transaction
  // start — so the write was always accepted and the probe always failed.
  //
  // The replacement must therefore derive its SQL from the verifier itself.
  assert.match(gate, /awk "\/<<'SQL'\/\{f=1;next\}/,
    "the proof must extract the PRE verifier's own SQL document")
  assert.match(gate, /\$PRE_VERIFIER" >"\$PROBE_SQL"/)
  assert.match(gate, /grep -q '\^set default_transaction_read_only = on;' "\$PROBE_SQL"/,
    "removing the read-only line from the verifier must break this proof")

  // Both halves: the effective state is measured, and a mutation is refused.
  assert.match(gate, /PROBE_TRANSACTION_READ_ONLY=' \|\| current_setting\('transaction_read_only'\)/)
  assert.match(gate, /\[ "\$EFFECTIVE" != "on" \]/)
  assert.match(gate, /25006/, "the refusal must be identified by SQLSTATE")
  assert.match(gate, /create table public\.d_r2_gate_probe/)
  assert.match(gate, /drop table if exists public\.d_r2_gate_probe/,
    "the probe object must be cleaned up even if it was unexpectedly created")

  // The SQL reaches psql on STDIN, which is what gives each statement its own
  // transaction; a -c string would collapse them into one and void the proof.
  assert.match(gate, /<"\$PROBE_SQL"/)
  // Executable lines only: the gate's header deliberately quotes the broken form
  // in order to explain it, and that explanation must not trip its own guard.
  assert.equal(
    /-c "set default_transaction_read_only[^"]*;[^"]*(create|insert|update|delete|drop|alter)/i
      .test(executable(gate)),
    false,
    "the invalid single-string form must never come back",
  )

  // And the proof is part of the verdict, not merely printed.
  assert.match(gate, /for v in .*"\$READ_ONLY_PROOF"/)
  assert.match(gate, /say "READ_ONLY_PROOF=\$READ_ONLY_PROOF"/)
})

test("the local gate actually executes both snapshots against a server", () => {
  // The whole point: pattern matching cannot find a planner error. If this gate
  // stopped running the real verifiers, that protection would be gone.
  assert.match(gate, new RegExp(`bash "\\$PRE_VERIFIER"`))
  assert.match(gate, new RegExp(`bash "\\$POST_VERIFIER"`))
  assert.match(gate, /supabase db reset/)
  // ...and it constructs the pre-state rather than assuming a reset provides it.
  assert.match(gate, /drop function if exists \$FUNCTION_SIGNATURE/)
  assert.match(gate, /pre-state not reached/)
  // ...and applies the canonical migration file verbatim.
  assert.match(gate, /-f "\$MIGRATION"/)
})
