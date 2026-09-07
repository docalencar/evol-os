/**
 * Contract guard for spec 09 — RUNNER ONLY.
 *
 * The claim E3-S2 makes is that the product DERIVES the competency gap and the
 * browser merely reads it. A spec that computed `expected - current` itself and
 * asserted its own arithmetic would look identical when green and prove nothing.
 * These assertions pin the difference.
 *
 * They also pin the scoping. The person profile still renders legacy cards that
 * derive a sign-inverted gap through a compatibility adapter; that debt is out
 * of scope for E3-S2, so the spec must never assert against those surfaces.
 *
 * ## Comments are stripped first
 *
 * The spec's own prose necessarily names the legacy sections and the formula in
 * order to explain why it avoids them. Asserting over raw file text would fail
 * on that documentation — a trap that has caught this repository before. Every
 * negative assertion below therefore runs against executable source only.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const raw = readFileSync(
  new URL("./specs/09-person-competency-gap.spec.ts", import.meta.url),
  "utf8"
)

/** Executable source: block comments, line comments and doc prose removed. */
const source = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
  .join("\n")

test("spec 09 reads the derived gap instead of computing it", () => {
  // No arithmetic on the levels anywhere in executable code: no subtraction
  // between the constants, and no reconstruction of the canonical formula.
  assert.doesNotMatch(source, /EXPECTED_LEVEL\s*-\s*/)
  assert.doesNotMatch(source, /CURRENT_LEVEL\s*-\s*/)
  assert.doesNotMatch(source, /expectedLevel\s*-\s*currentLevel/)
  assert.doesNotMatch(source, /currentLevel\s*-\s*expectedLevel/)
  assert.doesNotMatch(source, /Number\([^)]*\)\s*-\s*Number\(/)

  // The gap it asserts is a literal read off the rendered cell.
  assert.match(source, /toHaveText\("\+2"\)/)
  assert.match(source, /toHaveText\("0"\)/)
})

test("spec 09 scopes every gap assertion to the canonical surface", () => {
  assert.match(source, /Gap de competências/)
  assert.match(source, /canonicalGapSection/)

  // Legacy, sign-inverted surfaces must never be an assertion target.
  assert.doesNotMatch(source, /Resumo de talentos/)
  assert.doesNotMatch(source, /Acompanhamento do colaborador/)
  assert.doesNotMatch(source, /TalentSummaryCard|EmployeeCompetenciesSummaryCard/)
})

test("spec 09 proves a status transition, not just two numbers", () => {
  // Both canonical taxonomy labels must appear: the journey is only meaningful
  // if the derived state actually changes when the evidence changes.
  assert.match(source, /Gap de desenvolvimento/)
  assert.match(source, /Atende ao esperado/)
})

test("spec 09 opens the profile through the role the DOM actually exposes", () => {
  // "Ver perfil" is `<Button nativeButton={false} render={<Link/>}>`: Base UI
  // emits an anchor carrying an explicit role="button", which overrides the
  // anchor's implicit link role. Asking for `link` matches nothing and times
  // out against a control that is present and working.
  //
  // This has now cost two hosted runs — spec 06 hit it, documented it and fixed
  // it, and spec 09 reintroduced it in run 260907120642-8774b5. The canonical
  // pattern is pinned here so a third time is impossible.
  assert.match(source, /getByRole\(\s*"button",\s*\{\s*name:\s*\/Ver perfil\/i\s*\}\s*\)/)
  assert.doesNotMatch(source, /getByRole\(\s*"link"[^\n]*Ver perfil/)
})

test("spec 09 mutates through the product, not through privileged clients", () => {
  // The only privileged helper allowed is the canonical read-only id lookup.
  assert.doesNotMatch(source, /adminClient/)
  assert.doesNotMatch(source, /\.from\(|\.rpc\(|\.insert\(|\.update\(/)
  assert.match(source, /from "\.\.\/fixtures\/organization-lookup"/)

  // No sleeps: readiness is awaited through real UI state.
  assert.doesNotMatch(source, /waitForTimeout|setTimeout/)
})
