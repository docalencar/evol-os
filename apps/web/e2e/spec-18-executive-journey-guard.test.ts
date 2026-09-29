/** Static contract guards for E-E2E0. No hosted access. */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const root = resolve(import.meta.dirname, "../../..")
const spec = readFileSync(resolve(import.meta.dirname, "specs/18-executive-journey.spec.ts"), "utf8")
const runner = readFileSync(resolve(root, "scripts/local/run-e-e2e0-executive-review.sh"), "utf8")
const executiveSource = readFileSync(resolve(import.meta.dirname,
  "../src/features/executive/server/current-executive-home-source.ts"), "utf8")
const executiveBoundary = readFileSync(resolve(import.meta.dirname,
  "../src/features/executive/tests/executive-data-boundary-guard.test.ts"), "utf8")
const assessmentTemplateTypes = readFileSync(resolve(import.meta.dirname,
  "../src/features/assessments/types/assessment-template.ts"), "utf8")

test("the Executive fixture uses a canonical Assessment template type", () => {
  const canonical = /ASSESSMENT_TEMPLATE_TYPES\s*=\s*\[([\s\S]*?)\]\s*as const/
    .exec(assessmentTemplateTypes)?.[1].match(/"([^"]+)"/g)?.map((value) => value.slice(1, -1)) ?? []
  const createCall = /create_tenant_assessment_template_v1",\s*\{([\s\S]*?)\}\)/
    .exec(spec)?.[1] ?? ""
  const fixtureType = /p_type:\s*"([^"]+)"/.exec(createCall)?.[1]

  assert.ok(canonical.length > 0, "the canonical Assessment template taxonomy must be readable")
  assert.ok(fixtureType, "the Executive template fixture must declare its type explicitly")
  assert.ok(
    canonical.includes(fixtureType),
    `unsupported Executive Assessment template type: ${fixtureType}`,
  )
})

test("governed fixture provisioning has a bounded setup budget outside product proofs", () => {
  const journey = /test\.describe\("Executive MVP hosted journey", \(\) => \{([\s\S]*)\n\}\)/
    .exec(spec)?.[1] ?? ""
  const setup = /test\.beforeAll\(async \(\{ browser \}, testInfo\) => \{([\s\S]*?)\n  \}\)/
    .exec(journey)?.[1] ?? ""
  const firstProof = /test\("1-3\.[\s\S]*?async \(\{ page \}\) => \{([\s\S]*?)\n  \}\)/
    .exec(journey)?.[1] ?? ""

  assert.match(setup, /testInfo\.setTimeout\(EXECUTIVE_SETUP_TIMEOUT_MS\)/)
  assert.match(setup, /ensureRunOwnedForeignTenant/)
  assert.match(setup, /prepareFactualAssessment/)
  assert.match(setup, /finally[\s\S]*setupPage\.close\(\)/)
  assert.doesNotMatch(firstProof, /ensureRunOwnedForeignTenant|prepareFactualAssessment/)
  assert.doesNotMatch(spec, /test\.setTimeout\(/)
})

test("the future journey owns both tenants and all frozen steps", () => {
  assert.match(spec, /ensureRunOwnedForeignTenant/)
  assert.match(spec, /foreignCompanyId = foreignTenant\.companyId/)
  assert.match(spec, /foreignOwnerPersonId = foreignTenant\.ownerPersonId/)
  for (let step = 1; step <= 12; step += 1) assert.match(spec, new RegExp(`steps\\.add\\(${step}\\)`))
  assert.doesNotMatch(spec, /spec 02|Spec 02/)
})

test("authorized and denied role matrices stay exact", () => {
  assert.match(spec, /\[OWNER, ADMIN, HR\]/)
  assert.match(spec, /expectOpaqueExecutiveDenial\(page, MANAGER\)/)
  assert.match(spec, /expectOpaqueExecutiveDenial\(page, EMPLOYEE\)/)
  assert.match(spec, /getByRole\("link", \{ name: "Executive", exact: true \}\)/)
})

test("same-tenant denial protects Executive content without denying authenticated shell context", () => {
  const helper = /async function expectOpaqueExecutiveDenial[\s\S]*?\n\}/.exec(spec)?.[0] ?? ""

  assert.match(helper, /getByRole\("link", \{ name: "Executive", exact: true \}\)[\s\S]*toHaveCount\(0\)/)
  assert.match(helper, /page\.goto\("\/app\/executive"\)/)
  assert.match(helper, /getByRole\("heading", \{ name: "404" \}\)[\s\S]*toBeVisible\(\)/)
  assert.match(helper, /EXECUTIVE_DENIAL_FORBIDDEN_CONTENT/)
  assert.match(helper, /assessmentCycleId/)
  assert.match(helper, /AUTHORIZATION_INTERNALS/)
  assert.doesNotMatch(helper, /manifest\(\)\.companyName/)

  const foreignProof = /await switchTo\(page, FOREIGN\)([\s\S]*?)steps\.add\(9\)/
    .exec(spec)?.[1] ?? ""
  assert.match(foreignProof, /manifest\(\)\.companyName/)
  assert.match(foreignProof, /assessmentCycleId/)
  assert.match(foreignProof, /companyId\(\)/)
})

test("partial remains visible beside factual Workforce and Assessment evidence", () => {
  assert.match(spec, /factualEmployeeCount/)
  assert.match(spec, /Avaliação em andamento:/)
  assert.match(spec, /Workspace de Planning — Indisponível/)
  assert.match(spec, /Dados parciais/)
  assert.doesNotMatch(spec, /route\.(?:abort|fulfill)|page\.route/)
})

test("unfinished capabilities and prohibited semantics remain explicit", () => {
  for (const capability of ["Turnover", "Clima", "Desempenho agregado",
    "Potencial e Nine Box", "Sucessão", "Planos estratégicos"]) {
    assert.match(spec, new RegExp(capability))
  }
  assert.match(spec, /generic intelligence score\|reconhecimento\|check-in\|one-on-one/)
})

test("tenant isolation is content-based and independent of HTTP status", () => {
  assert.match(spec, /foreignCompanyId\)\.not\.toBe\(companyId\(\)\)/)
  assert.match(spec, /not\.toContainText\(assessmentCycleId\)/)
  assert.match(spec, /not\.toContainText\(companyId\(\)\)/)
  assert.doesNotMatch(spec, /response\(\)\.status|toBe\(404\)|status\(\).*404/)
})

test("evidence is atomic, deployment-bound and secret-free", () => {
  assert.match(spec, /executive-journey-evidence\.json/)
  assert.match(spec, /assetFingerprint/)
  assert.match(spec, /commitShaVerification/)
  assert.match(spec, /renameSync\(temporary, evidencePath\)/)
  assert.match(spec, /EXECUTIVE_JOURNEY=PASS/)
  const evidenceBlock = spec.slice(spec.indexOf("writeFileSync(temporary"))
  assert.doesNotMatch(evidenceBlock, /\.password|serviceRoleKey|anonKey/)
})

test("the runner is exact, Review-only and keeps the identity dependency", () => {
  assert.match(runner, /https:\/\/evol-os-review\.vercel\.app/)
  assert.match(runner, /rwfvxvbzaosgcyfxdjpt/)
  assert.match(runner, /gzrrwyiqfbnyprkdeqvm/)
  assert.match(runner, /oudngmrdtgengilpqqnz/)
  assert.match(runner, /E2E_ALLOW_NON_REVIEW_TARGET/)
  assert.match(runner, /E2E_DEPLOYED_COMMIT_SHA/)
  assert.match(runner, /--project=authenticated/)
  assert.match(runner, /18-executive-journey\.spec\.ts/)
  assert.doesNotMatch(runner, /--no-deps/)
})

test("Executive owning composition and direct-People prohibition stay canonical", () => {
  assert.match(executiveSource, /getExecutiveKPIDashboard/)
  assert.match(executiveSource, /createExecutiveDecisionFeed/)
  assert.match(executiveBoundary, /imports\.includes\("@\/features\/dashboard-read"\)/)
  assert.match(executiveBoundary, /people\/repositories/)
  assert.doesNotMatch(spec, /\.from\("people"\)/)
})
