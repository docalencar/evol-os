import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const transport = readFileSync(resolve(import.meta.dirname, "operational-transport.ts"), "utf8")
const command = readFileSync(resolve(import.meta.dirname, "operational-command.ts"), "utf8")
const combined = `${transport}\n${command}`

test("operational composition is Review-bound and invokes only approved boundaries", () => {
  for (const value of ["create_company_with_owner", "create_tenant_person_v2", "get_company_turnover_v1", "executeGovernedTurnoverBootstrap"]) assert.match(combined, new RegExp(value))
  assert.doesNotMatch(command, /project-ref|allowNonReviewTarget\s*:\s*true|playwright/i)
})

test("transport contains no protected mutation, backfill, formula or retry loop", () => {
  assert.doesNotMatch(combined, /insert\s+into\s+public\.people|update\s+public\.people|delete\s+from\s+public\.people|company_turnover_monthly_facts|coverage_started_at\s*=|backfill|turnover_percent\s*=|canonical_terminations\s*\/|for\s*\([^)]*retry|while\s*\([^)]*retry/i)
  assert.doesNotMatch(transport, /\.from\(["']people["']\)\.(insert|update|delete)/)
})

/**
 * Local repository facts the snapshot must MEASURE, with the pin each one was
 * once fabricated from. Review's database knows the ledger, the boundaries and
 * the ACLs; it cannot know which commit is main or what a migration file
 * hashes to, so a field filled from its own pin made `assertPre` compare a
 * constant against itself.
 *
 * `assertPre` itself is already covered by bootstrap-runner.test.ts. What was
 * missing — and what let both tautologies survive a green suite — is a check on
 * the PRODUCER.
 */
const MEASURED_FIELDS = [
  { field: "canonicalMain", pin: "EXPECTED_MAIN", resolver: "resolveCanonicalMain()" },
  { field: "migration0142Sha256", pin: "EXPECTED_MIGRATION_SHA", resolver: 'resolveMigrationPayloadSha("0142")' },
] as const

test("the snapshot never echoes a pin back at its own assertion", () => {
  for (const { field, pin, resolver } of MEASURED_FIELDS) {
    const assignment = new RegExp(`${field}\\s*:\\s*([A-Za-z_$][\\w$]*(?:\\([^)]*\\))?)`, "g")
    const producers = [...transport.matchAll(assignment)].map((match) => match[1])
    assert.ok(producers.length > 0, `the transport must build ${field}`)
    for (const producer of producers) {
      assert.notEqual(producer, pin, `${field} must be measured, never echoed from ${pin}`)
    }
    // Measured means resolved from the local repository, where the fact lives.
    assert.ok(producers.includes(resolver), `${field} must come from ${resolver}`)
    // The pin must not be imported for this purpose at all, so the tautology
    // cannot be reintroduced by an edit that looks local — including one that
    // launders the constant through an alias.
    assert.doesNotMatch(transport, new RegExp(`\\b${pin}\\b`), `${pin} must not appear in the transport`)
  }
  assert.match(transport, /from\s+["']\.\/repository-identity["']/)
})

test("inspect SQL is read-only and credentials never enter argv or output", () => {
  assert.match(transport, /default_transaction_read_only=on/)
  assert.doesNotMatch(transport, /-W|password.*console|console.*password/)
  assert.match(combined, /PGPASSWORD/)
  assert.match(command, /evol-os-review-pooler-url/)
})
