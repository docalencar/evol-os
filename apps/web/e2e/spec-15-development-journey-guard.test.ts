/** Static guards for the E2E-6 Development hosted harness. No Review access. */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const root = resolve(import.meta.dirname)
const spec = readFileSync(resolve(root, "specs/15-development-journey.spec.ts"), "utf8")
const fixture = readFileSync(resolve(root, "fixtures/development-fixture.ts"), "utf8")
const setup = readFileSync(resolve(root, "global-setup.ts"), "utf8")
const registry = readFileSync(resolve(root, "lifecycle/retention-registry.ts"), "utf8")
const contract = readFileSync(
  resolve(root, "../../../docs/Execution/D-E2E0-HOSTED-DEVELOPMENT-E2E-CONTRACT.md"),
  "utf8",
)

/** Comments necessarily name what the spec avoids; properties must hold in code. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

test("the application ledger is never read directly — the contract's hardest line", () => {
  // 0069 closed these to service_role and 0134 to authenticated. The spec proves
  // the application happened through the plan and the counts-only retention
  // boundary. A `.from()` on any ledger relation here would re-open, in test
  // code, exactly the surface D-SEC1 closed in the product.
  const active = code(spec + fixture)
  for (const relation of [
    "development_template_applications",
    "development_template_application_attempts",
    "development_template_application_snapshots",
    "development_template_application_lineage",
  ]) {
    assert.doesNotMatch(
      active,
      new RegExp(`from\\(["']${relation}["']\\)`),
      `${relation} must never be read directly`,
    )
  }
  // The permitted proof: counts only.
  assert.match(spec, /get_company_retention_pressure_v1/)
  assert.match(spec, /counts only|Counts only/)
})

test("every mutation is proved by durable readback, not by the browser alone", () => {
  // Each readback helper exists and targets a relation a client role may still
  // reach after 0134.
  for (const helper of ["readPlan", "readActions", "readReviews", "retentionCounts"]) {
    assert.match(spec, new RegExp(`async function ${helper}`), `${helper} must exist`)
  }
  for (const relation of [
    "development_plans",
    "development_actions",
    "development_goals",
    "development_reviews",
  ]) {
    assert.match(spec, new RegExp(`from\\("${relation}"\\)`))
  }
  // A toast alone never closes a step: the spec reloads and re-reads.
  assert.ok((spec.match(/page\.reload\(\)/g) ?? []).length >= 5)
  assert.ok((spec.match(/expect\.poll/g) ?? []).length >= 4)
})

test("review readback uses the real column names, not the plausible ones", () => {
  // `development_reviews` is keyed on `development_plan_id` and typed by `type`.
  // A readback selecting `plan_id`/`review_type` would return nothing and turn
  // the append-only proof into a tautology that always passes.
  //
  // Scoped to the reviews helper on purpose: `development_goals.plan_id` IS the
  // correct column (0008), so a blanket prohibition would forbid a correct query.
  const start = spec.indexOf("async function readReviews")
  const body = spec.slice(start, spec.indexOf("\n}", start))
  assert.match(body, /\.eq\("development_plan_id", planId\)/)
  assert.doesNotMatch(body, /\.eq\("plan_id", planId\)/)
  assert.doesNotMatch(body, /review_type/)
  assert.match(body, /\.order\("reviewed_at"\)/)
})

test("five actors, mapped onto the harness the repository already has", () => {
  assert.match(spec, /const AUTHOR: SyntheticRole = "admin"/)
  assert.match(spec, /const MANAGER: SyntheticRole = "manager"/)
  // The fixture places only `evaluatee` under the manager, so the subject must be
  // `evaluatee` and the nonparticipant must be `employee`. Swapping them would
  // silently destroy both the direct-report proof and the privacy proof.
  assert.match(spec, /const SUBJECT: SyntheticRole = "evaluatee"/)
  assert.match(spec, /const UNRELATED: SyntheticRole = "employee"/)
  assert.match(spec, /const FOREIGN: SyntheticRole = "onboarding"/)
  assert.match(setup, /"admin", "manager", "employee", "evaluatee"/)
})

test("authoring and application stay on different actors", () => {
  // If one actor did both, "a manager gains no authoring capability" would be
  // unprovable. The authoring block enters as AUTHOR; the application block
  // switches to MANAGER before touching the consumption surface.
  const authoring = spec.indexOf("A. 1-4 an administrative actor authors")
  const application = spec.indexOf("B. 5-10 a manager applies")
  assert.ok(authoring > 0 && application > authoring)
  assert.match(spec.slice(authoring, application), /enterAs\(page, AUTHOR\)/)
  assert.match(spec.slice(application), /switchTo\(page, MANAGER\)/)
})

test("privacy negatives are non-oracular and re-asserted after completion", () => {
  // Unauthorized and nonexistent must be indistinguishable: a 404, not a
  // distinguishable error. Asserted for both the nonparticipant and the foreign
  // actor, before AND after the plan reaches its terminal state.
  assert.ok((spec.match(/expect\(response\?\.status\(\)\)\.toBe\(404\)/g) ?? []).length >= 2)
  assert.match(spec, /\[UNRELATED, FOREIGN\] as const/)
  const completion = spec.indexOf("F/G. 23-29")
  assert.match(spec.slice(completion), /\[UNRELATED, FOREIGN\] as const/)
})

test("capability negatives are asserted as absence of the control, per actor", () => {
  // The subject may not skip, record a review or complete; a terminal plan offers
  // no mutation control at all.
  assert.match(spec, /"Ignorar ação" \}\),\s*\)\.toHaveCount\(0\)/)
  assert.match(spec, /getByRole\("button", \{ name: "Registrar revisão" \}\)\)\.toHaveCount\(0\)/)
  for (const label of ["Ativar plano", "Reabrir plano", "Concluir plano", "Iniciar ação"]) {
    assert.ok(spec.includes(`"${label}"`), `terminal-state probe must cover ${label}`)
  }
})

test("the fixture provisions competency facts the resolver re-verifies", () => {
  // complete_development_template_application_v1 re-checks competency name,
  // expected level and the subject's current level at application time. Without
  // these rows the journey fails closed on DEVELOPMENT_TEMPLATE_COMPETENCY_CHANGED.
  assert.match(fixture, /from\("competencies"\)/)
  assert.match(fixture, /from\("employee_competencies"\)/)
  assert.match(fixture, /archived_at/)
  assert.match(fixture, /DEVELOPMENT_EXPECTED_LEVEL = 4/)
  assert.match(fixture, /DEVELOPMENT_CURRENT_LEVEL = 2/)
  // Run-scoped, so a run never consumes another run's catalog.
  assert.match(fixture, /E2E Dev Competency \$\{runId\}/)
  assert.match(fixture, /E2E Dev Template \$\{runId\}/)
})

test("Development data is not provisioned for runs that never reach the journey", () => {
  // Global setup builds the tenant fixture for every spec. Development facts are
  // asked for by the spec that needs them, not bolted onto bootstrap.
  assert.doesNotMatch(setup, /createDevelopmentFixture|development-fixture/)
  assert.match(spec, /createDevelopmentFixture\(/)
})

test("cleanup stays retention-aware: this journey must retire, not clean", () => {
  // The journey necessarily writes immutable retained evidence, so the registry
  // must already classify those relations. If it stopped doing so, a runner could
  // classify CLEANED and then send a delete that must fail.
  for (const relation of [
    "development_template_application_snapshots",
    "development_template_application_lineage",
    "development_reviews",
    "development_private_audit",
  ]) {
    assert.match(registry, new RegExp(`table: "${relation}"`))
  }
  assert.match(registry, /PRIVILEGED_COUNT_BOUNDARY/)
  // And the spec asserts the retained evidence survived rather than assuming it.
  assert.match(spec, /toBeGreaterThan\(0\)/)
})

test("a goal's disclosure is expanded before its contents are addressed", () => {
  // Template goals are native `<details>` and the page never renders one `open`,
  // so their children are in the DOM but not visible. Run 260921164722-a2b764
  // spent 15s waiting for an "Adicionar ação" button that genuinely existed, on
  // a page whose goal had been created successfully — the timeout said "missing"
  // when the truth was "collapsed".
  //
  // A static selector audit cannot see this: the trigger's own component is
  // correct, and the gate is an ancestor in a different file.
  assert.match(spec, /async function expandGoal/)
  assert.match(spec, /toHaveJSProperty\("open", true\)/)

  // The trigger must be resolved WITHIN the expanded goal, never from the page.
  const loop = spec.slice(spec.indexOf("for (const title of [ACTION_ONE, ACTION_TWO]"))
  assert.match(loop, /const goal = await expandGoal\(/)
  assert.match(loop, /openDialog\(goal, "Adicionar ação"\)/)
  assert.doesNotMatch(loop, /openDialog\(page, "Adicionar ação"\)/)

  // Browser-visible success is asserted on the summary, which stays visible
  // whether or not a re-render leaves the disclosure open. Without this the
  // proof would silently depend on undefined reconciliation behaviour.
  assert.match(loop, /ações de desenvolvimento/)
})

test("the spec targets Review only, through the harness identity gate", () => {
  const active = code(spec + fixture)
  // No hard-coded environment. The gate lives in global setup and fails closed.
  assert.doesNotMatch(active, /https?:\/\//)
  assert.doesNotMatch(active, /gzrrwyiqfbnyprkdeqvm|oudngmrdtgengilpqqnz/)
  assert.match(setup, /assertReviewTarget\(\)/)
})

test("the spec's step numbers trace to the frozen contract", () => {
  // Each lettered block names the contract clauses it discharges, so a failure
  // reports which clause broke rather than which line did.
  for (const block of ["A. 1-4", "B. 5-10", "C. 11-14", "D. 15-17", "E. 18-22", "F/G. 23-29"]) {
    assert.ok(spec.includes(block), `missing contract block ${block}`)
  }
  // The contract defines 29 steps, and step 10 requires the applied plan to show
  // its historical origin. The contract froze that SEMANTIC; the literal label
  // belongs to the product (D-P3), so the spec pins the string and the guard
  // pins the semantic rather than pretending the contract quotes it.
  assert.match(contract, /29\./)
  assert.match(contract, /shows the historical template origin/)
  assert.match(spec, /NO_ORIGIN_LABEL = "Sem template de origem"/)
  assert.match(spec, /getByText\(NO_ORIGIN_LABEL\)\)\.toBeHidden\(\)/)
})
