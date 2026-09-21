/** Static guards for the E2E-6 Development hosted harness. No Review access. */

import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
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

  // The PLAN page nests actions in the same disclosure, and every server render
  // and every reload closes it again. Run 260921184137-70e10c resolved the
  // action's <p> 33 times and reported it hidden. Same class, second surface —
  // so this guard is extended rather than duplicated.
  assert.match(spec, /async function openPlanGoal/)
  assert.match(spec, /return expandGoal\(page, developmentCompetencyName/)

  // Every action addressed on the plan page must have the disclosure opened
  // since the last render: walking back from each `actionCard`, the nearest
  // landmark must be the expansion, not a reload or a fresh plan load.
  const body = code(spec)
  for (const match of [...body.matchAll(/actionCard\(page,/g)]) {
    const before = body.slice(0, match.index)
    const landmark = Math.max(
      before.lastIndexOf("openPlanGoal(page)"),
      before.lastIndexOf("page.reload()"),
      before.lastIndexOf("openPlan(page)"),
    )
    assert.ok(landmark >= 0, "an action is addressed before the plan is even open")
    assert.equal(
      before.slice(landmark).startsWith("openPlanGoal(page)"),
      true,
      "an action is addressed on the plan page without reopening its disclosure",
    )
  }
})

test("a state change is asserted on the surface that actually renders it", () => {
  // The failure class: borrowing one surface's vocabulary for another. Published
  // templates read "Publicado" in the INDEX table's status badge; the DETAIL page
  // never renders that word, expressing publication by withdrawing the authoring
  // controls. Run 260921170444-21443c asserted the index's label against the
  // detail page and reported a 30s timeout for a publication that had succeeded.
  //
  // Guarded as a property, not as a string: every status label the table defines
  // must be asserted through a row, which only the index has.
  const table = readFileSync(
    resolve(root, "../src/features/development/templates/components/development-template-table.tsx"),
    "utf8",
  )
  for (const label of ["Rascunho", "Publicado"]) {
    assert.match(table, new RegExp(`label: "${label}"`), `${label} must come from the table`)
    assert.doesNotMatch(
      code(spec),
      new RegExp(`getByText\\("${label}"`),
      `"${label}" is an index status label and must never be asserted as page text`,
    )
  }
  // Both are asserted through a row, which only the index has.
  assert.match(spec, /getByRole\("row", \{ name: new RegExp\(name\) \}\)\)\.toContainText\("Rascunho"\)/)
  assert.match(
    spec,
    /getByRole\("row", \{ name: new RegExp\(name\) \}\)\)\.toContainText\(PUBLISHED_STATUS\)/,
  )

  // Publication success is proved by the product's own signals: the toast, the
  // immutability notice, and the withdrawal of the publish control.
  assert.match(spec, /VERSION_PUBLISHED = "Versão publicada com sucesso\."/)
  assert.match(spec, /confirm\(page, VERSION_PUBLISHED\)/)
  assert.match(spec, /"Publicar versão" \}\)\)\.toHaveCount\(0\)/)

  // ...and still by an independent durable readback afterwards.
  assert.match(spec, /from\("development_template_versions"\)/)
  assert.match(spec, /toBe\("published"\)/)
})

test("a test's first actor logs in; sign-out is only for switching mid-test", () => {
  // `signOutThroughUi` ends a LIVE session through the real UI — that sign-out is
  // what proves the authorization boundary, so it is never softened into "log in
  // if not already signed in". It therefore has a precondition: a session exists.
  //
  // `mode: "serial"` shares ordering and failure propagation between tests; it
  // does NOT share the `page` fixture. Run 260921172652-e6b59e opened block B
  // with `switchTo` and waited 15s for "Sair" on a fresh `about:blank` page.
  //
  // Checked as a property across every spec that switches actors, so this cannot
  // be reintroduced here or anywhere else, and phrased against the switch helper
  // rather than against the literal "Sair" selector.
  const LOGIN = /^(enterAs|loginThroughUi|enterTenantB)$/
  const SWITCH = /^switchTo/

  const specsDir = resolve(root, "specs")
  for (const file of readdirSync(specsDir).filter((name) => name.endsWith(".spec.ts"))) {
    const source = code(readFileSync(resolve(specsDir, file), "utf8"))
    if (!SWITCH.test(source.match(/async function (\w+)/g)?.join(" ") ?? "")) {
      if (!/switchTo/.test(source)) continue
    }

    // Local helpers, so the search can see through one call: spec 13 establishes
    // its first actor inside `discoverRunResourceId`, which is correct. A guard
    // that only scanned the test body would call that a defect — it did.
    const helpers = new Map<string, string>()
    for (const match of source.matchAll(/async function (\w+)\([\s\S]*?\n\}/g)) {
      helpers.set(match[1], match[0])
    }

    /** The first actor operation reachable from a body, following local calls. */
    const firstActorOp = (body: string, seen = new Set<string>()): string | null => {
      for (const call of body.matchAll(/\b(\w+)\s*\(/g)) {
        const name = call[1]
        if (LOGIN.test(name) || SWITCH.test(name)) return name
        if (helpers.has(name) && !seen.has(name)) {
          seen.add(name)
          const nested = firstActorOp(helpers.get(name)!.replace(/^async function \w+/, ""), seen)
          if (nested) return nested
        }
      }
      return null
    }

    for (const body of source.split(/\n\s*test\(/).slice(1)) {
      const first = firstActorOp(body.slice(0, body.indexOf("\n  })")))
      if (!first) continue
      assert.match(
        first,
        LOGIN,
        `${file}: a test must establish its first actor by logging in, not by switching`,
      )
    }
  }
})

test("a control the product derives is asserted, never driven", () => {
  // For a manager the application presentation returns `owners: [actor]` and
  // `fixedOwnerId: actor.id`, and the dialog renders the owner select disabled
  // with that value. Run 260921180706-8fac13 spent 15s trying to select it.
  //
  // Tied to the product's own derivation rather than to the literal id: if
  // ownership ever becomes selectable for a manager, this guard fails and the
  // question is reopened deliberately instead of a spec silently drifting.
  const presentation = readFileSync(
    resolve(root, "../src/features/development/templates/services/get-template-application-presentation.ts"),
    "utf8",
  )
  const dialog = readFileSync(
    resolve(root, "../src/features/development/templates/components/apply-development-template-dialog.tsx"),
    "utf8",
  )
  assert.match(presentation, /fixedOwnerId: actor\.id/, "a manager's ownership must stay derived")
  assert.match(dialog, /disabled=\{isPending \|\| Boolean\(fixedOwnerId\)\}/)

  // So the spec must not drive it, and must prove it instead — visibly and then
  // independently from canonical state.
  assert.doesNotMatch(code(spec), /#ownerId"\)\.selectOption/)
  assert.match(spec, /expect\(ownerSelect\)\.toBeDisabled\(\)/)
  assert.match(spec, /expect\(ownerSelect\)\.toHaveValue\(personIdOf\(MANAGER\)\)/)
  assert.match(spec, /select\("id, status, employee_id, owner_id/)
  assert.match(spec, /expect\(plan\.owner_id\)\.toBe\(personIdOf\(MANAGER\)\)/)
})

test("surface markers are unconditional, and negatives can actually fail", () => {
  // The plan page renders `plan.description ?? "Plano de desenvolvimento
  // individual."`. That string is a FALLBACK: it appears only when a plan has no
  // description, and every plan in this journey inherits the template's. Run
  // 260921182529-0ba165 waited 30s for it on a plan that had loaded correctly.
  //
  // The class is "anchoring on a conditional fallback", so the guard reads the
  // fallback out of the product and forbids depending on it — either way round.
  // The same anchor was also used as a NEGATIVE, where being unreachable made it
  // vacuously true: a proof that cannot fail is worse than no proof.
  const planPage = readFileSync(
    resolve(root, "../src/app/(dashboard)/app/development/plans/[id]/page.tsx"),
    "utf8",
  )
  const fallback = planPage.match(/plan\.description \?\?\s*\n?\s*"([^"]+)"/)
  assert.ok(fallback, "the plan page must still describe its fallback description")
  assert.doesNotMatch(
    code(spec),
    new RegExp(fallback[1].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    "the spec must not anchor on the plan page's fallback description",
  )

  // What it anchors on instead: an unconditional section heading, plus the
  // run-scoped plan title read back from canonical state rather than predicted.
  assert.match(planPage, /Competências e ações/)
  assert.match(spec, /const PLAN_SURFACE_SECTION = "Competências e ações"/)
  assert.match(spec, /planTitle = String\(plan\.title \?\? ""\)/)
  assert.match(spec, /getByRole\("heading", \{ level: 1, name: planTitle \}\)\)\.toBeVisible\(\)/)

  // And the negative is anchored on that same run-scoped title, so it fails if a
  // refused response ever leaks the plan.
  assert.match(spec, /getByRole\("heading", \{ level: 1, name: planTitle \}\)\)\.toHaveCount\(0\)/)
  assert.ok((spec.match(/expect\(response\?\.status\(\)\)\.toBe\(404\)/g) ?? []).length >= 2)
})

test("an actor defined by its tenant is resolved from that tenant", () => {
  // The contract's `foreign_owner` is the owner of a SEPARATE tenant. The
  // `onboarding` identity only becomes that after spec 02's real wizard creates
  // tenant B and records it in the journal; before that it is unattached — no
  // membership, no person, no company — and the product correctly sends it to
  // first-access onboarding.
  //
  // Run 260921185836-f8c2dd resolved the actor by role name, skipping that
  // dependency, then failed on a tenant-shell marker an unattached identity
  // cannot satisfy. The class is "an actor precondition asserted but never
  // established", so the guard requires the dependency to be declared and
  // unbypassable — the same shape specs 04 and 13 already use.
  assert.match(spec, /manifest\(\)\.onboardingCompany/)
  assert.match(spec, /E2E_TENANT_B_MISSING/)
  assert.match(spec, /Spec 02 must complete first/)

  // Resolution must go through the tenant, not the role name, or the dependency
  // can be silently bypassed again.
  const resolver = spec.slice(spec.indexOf("function actor("))
  assert.match(resolver.slice(0, resolver.indexOf("\n}")), /role === FOREIGN/)
  assert.match(spec, /candidate\.userId === foreignTenant\(\)\.ownerUserId/)

  // And foreignness is proved at login, not assumed.
  assert.match(spec, /getByText\(foreignTenant\(\)\.companyName\)/)

  // The negatives must still reach the contract's route and status: absence of a
  // shell is never allowed to stand in for an authorization outcome.
  assert.ok((spec.match(/expect\(response\?\.status\(\)\)\.toBe\(404\)/g) ?? []).length >= 2)
  assert.ok((spec.match(/goto\(`\/app\/development\/plans\/\$\{planId\}`\)/g) ?? []).length >= 2)
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
