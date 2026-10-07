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

test("inspect SQL is read-only and credentials never enter argv or output", () => {
  assert.match(transport, /default_transaction_read_only=on/)
  assert.doesNotMatch(transport, /-W|password.*console|console.*password/)
  assert.match(combined, /PGPASSWORD/)
  assert.match(command, /evol-os-review-pooler-url/)
})
