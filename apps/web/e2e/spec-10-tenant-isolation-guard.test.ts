/**
 * Contract guard for spec 10 — RUNNER ONLY.
 *
 * Isolation proofs are unusually easy to write in a way that passes without
 * proving anything: assert an absence that was never possible, or compare a
 * foreign id against nothing at all. These assertions pin the shape that makes
 * spec 10 meaningful.
 *
 * The load-bearing one is the oracle comparison. A spec that only checked
 * "tenant B cannot open tenant A's position" would still be green if the app
 * announced *why* it refused — which is exactly the disclosure the slice exists
 * to rule out. So the guard requires both branches, foreign and random, and
 * requires their outcomes to be compared to each other.
 *
 * Negative assertions run against executable source with comments stripped: the
 * spec's prose necessarily names the things it avoids in order to explain the
 * design, and asserting over raw text would fail on the documentation.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const raw = readFileSync(
  new URL("./specs/10-career-tenant-isolation.spec.ts", import.meta.url),
  "utf8"
)

/** Executable source: block comments, line comments and doc prose removed. */
const source = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
  .join("\n")

test("spec 10 compares a foreign id against one that exists nowhere", () => {
  // Both branches must exist...
  assert.match(source, /randomUUID\(\)/)
  assert.match(source, /outcomeForPositionId\(page, foreignId\)/)
  assert.match(source, /outcomeForPositionId\(page, nonexistentId\)/)

  // ...and their observable outcomes must actually be compared. Without this
  // the spec would prove refusal, not indistinguishability.
  assert.match(source, /foreign\.pathname\)\.toBe\(nonexistent\.pathname\)/)
})

test("spec 10 proves absence by exact run-scoped identity", () => {
  // Absence of THIS run's records, never "the list is empty" — tenant B has a
  // legitimate catalog of its own.
  assert.match(source, /competencyName\(runId\)/)
  assert.match(source, /seniorityLabel\(runId\)/)
  assert.match(source, /seniorityCode\(runId\)/)
  assert.doesNotMatch(source, /toBeEmpty|toHaveCount\(0\)/)
})

test("spec 10 forbids tenant A content leaking through the foreign route", () => {
  assert.match(source, /foreign\.body\)\.not\.toContain\(secret\)/)
  assert.match(source, /positionName\(runId\)/)
  // The id itself must not be echoed back as recognition.
  assert.match(source, /foreignId,/)
})

test("spec 10 proves isolation through the browser, not privileged reads", () => {
  // The only privileged helper allowed is the canonical read-only id lookup,
  // used to obtain a real foreign target for the browser to aim at.
  assert.doesNotMatch(source, /adminClient/)
  assert.doesNotMatch(source, /\.from\(|\.rpc\(|\.insert\(|\.update\(/)
  assert.match(source, /from "\.\.\/fixtures\/organization-lookup"/)

  assert.doesNotMatch(source, /waitForTimeout|setTimeout/)
})

test("spec 10 stays out of gap arithmetic and legacy surfaces", () => {
  // Spec 09 owns the derivation; this slice must not re-prove or duplicate it.
  assert.doesNotMatch(source, /expectedLevel\s*-\s*currentLevel/)
  assert.doesNotMatch(source, /currentLevel\s*-\s*expectedLevel/)
  assert.doesNotMatch(source, /Gap de desenvolvimento|Atende ao esperado/)

  // Legacy sign-inverted cards must never become the isolation target.
  assert.doesNotMatch(source, /TalentSummaryCard|EmployeeCompetenciesSummaryCard/)
  assert.doesNotMatch(source, /Resumo de talentos|Acompanhamento do colaborador/)
})
