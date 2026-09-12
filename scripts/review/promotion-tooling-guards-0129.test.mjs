import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const migrationPath = resolve(here, "../../supabase/migrations/0129_harden_activity_events_client_privileges.sql")
const runnerPath = resolve(here, "promote-0129-activity-events-hardening.sh")
const prePath = resolve(here, "verify-0129-activity-events-hardening-pre.sh")
const postPath = resolve(here, "verify-0129-activity-events-hardening-post.sh")
const migration = () => readFileSync(migrationPath, "utf8")
const runner = () => readFileSync(runnerPath, "utf8")

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
  assert.equal((source.match(/supabase db push --linked --yes/g) ?? []).length, 1)
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
