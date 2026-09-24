/** Static guards for the PLN-P6 hosted Planning harness. No Review access. */

import assert from "node:assert/strict"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

import { runEvidenceFile } from "./helpers/run-paths"

const spec = readFileSync(
  resolve(import.meta.dirname, "specs/16-organization-planning-journey.spec.ts"),
  "utf8",
)
const onboardingFixture = readFileSync(
  resolve(import.meta.dirname, "fixtures/onboarding-tenant.ts"),
  "utf8",
)

test("the timeline route carries the canonical workspace identity", () => {
  const helperStart = spec.indexOf("async function planningTimeline")
  const helper = spec.slice(helperStart, spec.indexOf("\n}", helperStart))

  assert.match(helper, /if \(!workspaceId\) throw new Error\("E2E_WORKSPACE_MISSING"\)/)
  assert.match(
    helper,
    /planning\/timeline\?workspaceId=\$\{encodeURIComponent\(workspaceId\)\}/,
  )
  assert.doesNotMatch(helper, /page\.goto\("\/app\/organization\/planning\/timeline"\)/)
})

test("targeted Planning provisions its own run-scoped foreign tenant", () => {
  const firstStep = spec.slice(
    spec.indexOf('test("1-2. a workspace'),
    spec.indexOf("// ------------------------------------------------------------------ B"),
  )

  assert.match(spec, /ensureRunOwnedForeignTenant/)
  assert.match(firstStep, /await ensureForeignTenant\(page\)/)
  assert.ok(
    firstStep.indexOf("ensureForeignTenant(page)") < firstStep.indexOf("enterAs(page, AUTHOR)"),
  )
  assert.match(spec, /expect\(tenant\.companyId\)\.not\.toBe\(tenantA\)/)
  assert.doesNotMatch(spec, /Spec 02|spec 02/)
  assert.match(onboardingFixture, /const companyName = `E2E Onboarding \$\{runId\}`/)
  assert.match(onboardingFixture, /resolveAndJournalOnboardingTenant\(journal, user\.userId\)/)
  assert.match(onboardingFixture, /if \(journal\.onboardingCompany\)/)
  assert.match(onboardingFixture, /journal\.onboardingCompany\.ownerUserId !== user\.userId/)
})

test("foreign-owner denial remains an executed step-19 assertion", () => {
  const stepStart = spec.indexOf("// 19. the change-set lineage")
  const step19 = spec.slice(stepStart, spec.indexOf("\n  })", stepStart))

  assert.match(step19, /await switchTo\(page, FOREIGN\)/)
  assert.match(step19, /page\.goto\(`\/app\/organization\/planning\/\$\{scenarioId\}`\)/)
  assert.match(
    step19,
    /expect\(page\.getByText\(FOREIGN_DENIAL, \{ exact: true \}\)\)\.toBeVisible\(\)/,
  )
  assert.match(step19, /getByText\(scenarioName, \{ exact: false \}\)\)\.toHaveCount\(0\)/)
  assert.match(step19, /getByText\(departmentName, \{ exact: false \}\)\)\.toHaveCount\(0\)/)
  assert.match(step19, /\.\.\.OPERATION_LABELS/)
  assert.doesNotMatch(step19, /response\?\.status|toBe\(404\)/)
})

function foreignDenialAccepted(input: {
  genericDenialVisible: boolean
  scenarioIdentityVisible: boolean
  projectedContentVisible: boolean
  actionableControlVisible: boolean
}): boolean {
  return (
    input.genericDenialVisible &&
    !input.scenarioIdentityVisible &&
    !input.projectedContentVisible &&
    !input.actionableControlVisible
  )
}

test("canonical generic denial with no foreign content passes", () => {
  assert.equal(
    foreignDenialAccepted({
      genericDenialVisible: true,
      scenarioIdentityVisible: false,
      projectedContentVisible: false,
      actionableControlVisible: false,
    }),
    true,
  )
})

for (const [name, exposed] of [
  ["foreign scenario identity", "scenarioIdentityVisible"],
  ["projected department content", "projectedContentVisible"],
  ["scenario mutation or lifecycle control", "actionableControlVisible"],
] as const) {
  test(`${name} makes the foreign denial fail`, () => {
    const deniedSurface = {
      genericDenialVisible: true,
      scenarioIdentityVisible: false,
      projectedContentVisible: false,
      actionableControlVisible: false,
    }

    assert.equal(
      foreignDenialAccepted({
        ...deniedSurface,
        [exposed]: true,
      }),
      false,
    )
  })
}

test("the stale conflict emits durable non-overwrite evidence", () => {
  const stepStart = spec.indexOf('test("3-6. content is authored')
  const stepEnd = spec.indexOf('// ------------------------------------------------------------------ C', stepStart)
  const step = spec.slice(stepStart, stepEnd)

  for (const evidence of [
    "staleSettlementMs",
    "surfacedConflict",
    "staleExpectedVersion",
    "winningVersion",
    "canonicalVersionBeforeStale",
    "canonicalVersionAfterStale",
    "activeChangeSetsBeforeStale",
    "activeChangeSetsAfterStale",
    "staleContentAbsent",
    'verdict: "NON_OVERWRITE=PASS"',
  ]) {
    assert.match(step, new RegExp(evidence))
  }

  assert.match(step, /expect\(afterStale\.version\)\.toBe\(afterWinner\.version\)/)
  assert.match(step, /expect\(contentAfterStale\)\.toEqual\(contentBeforeStale\)/)
  assert.match(step, /expect\(payloads\)\.not\.toContain\(`\$\{departmentName\} STALE`\)/)
  assert.match(step, /runEvidenceFile\(manifest\(\)\.runId, "step-6-non-overwrite\.json"\)/)
  assert.match(step, /writeFileSync\(temporaryEvidencePath, step6Evidence, \{ mode: 0o600 \}\)/)
  assert.match(step, /renameSync\(temporaryEvidencePath, evidencePath\)/)
  assert.match(step, /testInfo\.attach\("step-6-non-overwrite\.json", \{\s*path: evidencePath,/)
})

test("step-6 evidence has a durable run-scoped archive path", () => {
  const previous = process.env.E2E_RUN_DIR
  const isolatedRunDir = mkdtempSync(resolve(tmpdir(), "pln-p6g-evidence-"))
  process.env.E2E_RUN_DIR = isolatedRunDir
  try {
    assert.equal(
      runEvidenceFile("260924012303-51e37c", "step-6-non-overwrite.json"),
      resolve(isolatedRunDir, "archive", "260924012303-51e37c", "step-6-non-overwrite.json"),
    )
  } finally {
    if (previous === undefined) delete process.env.E2E_RUN_DIR
    else process.env.E2E_RUN_DIR = previous
  }
})

function helper(name: string, nextName: string): string {
  const start = spec.indexOf(`async function ${name}`)
  assert.ok(start >= 0, `${name} must exist`)
  const end = spec.indexOf(`async function ${nextName}`, start)
  assert.ok(end > start, `${nextName} must follow ${name}`)
  return spec.slice(start, end)
}

test("operation selection opens a menu that starts closed", () => {
  const ensureOpen = helper("ensureOperationsMenuOpen", "runOperation")

  assert.match(ensureOpen, /if \(!\(await operationsMenuIsOpen\(page\)\)\)/)
  assert.match(ensureOpen, /getByRole\("button", \{ name: `Operações de \$\{scenarioName\}` \}\)\.click\(\)/)
  assert.match(ensureOpen, /expect\.poll\(\(\) => operationsMenuIsOpen\(page\)\)\.toBe\(true\)/)
})

test("operation selection reuses a menu that is already open", () => {
  const run = helper("runOperation", "offeredOperations")

  assert.match(run, /await ensureOperationsMenuOpen\(page\)/)
  assert.match(run, /getByRole\("button", \{ name: label \}\)\.click\(\)/)
  assert.doesNotMatch(run, /Operações de \$\{scenarioName\}/)
})

test("capability inspection closes its menu before operation execution", () => {
  const inspect = helper("offeredOperations", "visibleOperations")
  const inspectCapabilities = inspect.indexOf("visibleOperations(page)")
  const closeMenu = inspect.indexOf("await trigger.click()")
  const proveClosed = inspect.indexOf("operationsMenuIsOpen(page)).toBe(false)")

  assert.match(inspect, /await ensureOperationsMenuOpen\(page\)/)
  assert.ok(inspectCapabilities >= 0)
  assert.ok(closeMenu > inspectCapabilities)
  assert.ok(proveClosed > closeMenu)
})

test("an absent operations trigger means no lifecycle menu is required", () => {
  const inspect = helper("offeredOperations", "visibleOperations")

  assert.match(inspect, /if \(\(await trigger\.count\(\)\) === 0\)/)
  assert.match(inspect, /return visibleOperations\(page\)/)
  assert.ok(
    inspect.indexOf("trigger.count()") < inspect.indexOf("ensureOperationsMenuOpen(page)"),
    "absence must settle before any attempt to open the menu",
  )
})

test("a present operations trigger is inspected whether initially closed or open", () => {
  const inspect = helper("offeredOperations", "visibleOperations")

  assert.match(inspect, /await ensureOperationsMenuOpen\(page\)/)
  assert.match(inspect, /const offered = await visibleOperations\(page\)/)
  assert.match(inspect, /await trigger\.click\(\)/)
})

test("actionable terminal operations are still returned and rejected", () => {
  const visible = helper("visibleOperations", "expectTerminalControlUnavailable")
  const terminalStep = spec.slice(spec.indexOf("// 17. a published scenario"), spec.indexOf("// 18. terminality"))

  assert.match(visible, /for \(const label of OPERATION_LABELS\)/)
  assert.match(visible, /offered\.push\(label\)/)
  assert.match(terminalStep, /expect\(await offeredOperations\(page\)\)\.toEqual\(\[\]\)/)
})

function terminalControlAccepted(count: number, enabled: boolean): boolean {
  return count === 0 || (count === 1 && !enabled)
}

test("an absent terminal control is accepted", () => {
  assert.equal(terminalControlAccepted(0, false), true)
})

test("a disabled terminal control is accepted", () => {
  assert.equal(terminalControlAccepted(1, false), true)
  const start = spec.indexOf("async function expectTerminalControlUnavailable")
  const unavailable = spec.slice(start, spec.indexOf("test.describe(", start))
  assert.match(unavailable, /if \(\(await control\.count\(\)\) === 0\) return/)
  assert.match(unavailable, /await expect\(control\)\.toBeDisabled\(\)/)
})

test("an enabled terminal control is rejected", () => {
  assert.equal(terminalControlAccepted(1, true), false)
  const terminalStep = spec.slice(spec.indexOf("// 17. a published scenario"), spec.indexOf("// 18. terminality"))
  assert.match(terminalStep, /expectTerminalControlUnavailable\(page, "Publicar Cenário"\)/)
  assert.doesNotMatch(terminalStep, /"Publicar Cenário",/)
})

test("rejection reason is reread through the trusted lifecycle boundary", () => {
  assert.match(spec, /rpc\("get_planning_scenario_lifecycle_v1"/)
  assert.match(spec, /const rejectedScenario = await readTrustedScenario\(\)/)
  assert.match(spec, /rpc\("get_planning_scenarios_v1"/)
  assert.match(spec, /entry\.event_type === "planning\.scenario\.rejected"/)
  assert.match(spec, /expect\(rejectionFacts\)\.toHaveLength\(1\)/)
  assert.match(spec, /reason: REJECTION_REASON/)
  assert.match(spec, /expect\(rejectedScenario\.company_id\)\.toBe\(tenantACompanyId\(\)\)/)
})

test("projection contains the authored department while live organization stays unchanged", () => {
  assert.match(spec, /rpc\("get_tenant_organization_directory_v1"/)
  assert.match(spec, /liveOrganizationBefore = await readLiveOrganization\(\)/)
  assert.match(spec, /expect\(liveOrganizationAfter\)\.toEqual\(liveOrganizationBefore\)/)
  assert.match(spec, /JSON\.stringify\(snapshot\?\.organization \?\? \{\}\)/)
  assert.match(spec, /expect\(JSON\.stringify\(snapshot\?\.organization/)
  assert.match(spec, /liveOrganizationAfter\.some\(\(entry\) => entry\.name === `\$\{departmentName\}\$\{REVISED_SUFFIX\}`\)/)
})
