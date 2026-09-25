/** Static contract guards for L-E2E0. No hosted access. */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const spec = readFileSync(resolve(import.meta.dirname, "specs/17-leadership-journey.spec.ts"), "utf8")
const product = [
  "src/features/manager-intelligence/repositories/leadership-attention-repository-adapter.ts",
  "src/features/manager-intelligence/presenters/attention-queue-presenter.ts",
].map((path) => readFileSync(resolve(import.meta.dirname, "..", path), "utf8")).join("\n")

test("the hosted journey is self-contained and owns both tenants", () => {
  assert.match(spec, /ensureRunOwnedForeignTenant/)
  assert.match(spec, /prepareAssessment\(\)/)
  assert.match(spec, /prepareDevelopmentTemplate\(\)/)
  assert.doesNotMatch(spec, /spec 02|Spec 02|14-assessment|15-development/)
})

test("all frozen Leadership steps and durable evidence are explicit", () => {
  for (let step = 1; step <= 12; step += 1) assert.match(spec, new RegExp(`steps\\.add\\(${step}\\)`))
  assert.match(spec, /leadership-journey-evidence\.json/)
  assert.match(spec, /renameSync\(temporary, evidencePath\)/)
  assert.match(spec, /LEADERSHIP_JOURNEY=PASS/)
})

test("routing uses exact owning-domain identities", () => {
  assert.match(spec, /responses\/\$\{responseId\}/)
  assert.match(spec, /applyFor=\$\{personId\(SUBJECT\)\}/)
  assert.match(spec, /development\/plans\/\$\{planId\}/)
  assert.doesNotMatch(spec, /employees\/\$\{|people\/\$\{/)
})

test("Leadership remains a trusted read with no direct People dependency", () => {
  assert.match(product, /get_manager_leadership_attention_v1/)
  assert.doesNotMatch(product, /\.from\(["']people["']\)/)
  assert.doesNotMatch(product, /recognition|teamHealth|intelligenceScore|decisionScore/i)
  assert.doesNotMatch(spec, /\.from\(["']people["']\)/)
})

test("failure and empty state remain distinct in the active product", () => {
  const page = readFileSync(
    resolve(import.meta.dirname, "../src/app/(dashboard)/app/manager/page.tsx"), "utf8",
  )
  const errorBoundary = readFileSync(
    resolve(import.meta.dirname, "../src/app/(dashboard)/app/manager/error.tsx"), "utf8",
  )
  assert.match(errorBoundary, /A fila de atenção não foi substituída por um resultado vazio/)
  assert.match(page, /getAttentionQueue/)
})
