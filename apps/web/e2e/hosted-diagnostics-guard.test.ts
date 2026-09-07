/**
 * Guards for hosted-failure diagnosability — RUNNER ONLY.
 *
 * A hosted run is the most expensive test this project has: it mutates Review,
 * creates real tenants and leaves a RETIRED graph behind. Run
 * 260907120642-8774b5 failed on two specs and produced **no trace at all**,
 * because `trace: "on-first-retry"` never fires for the operator, who runs
 * without CI retries. The cost of the run was paid and the evidence was not
 * collected.
 *
 * These assertions pin the two changes that make the next hosted failure
 * explain itself, and pin the knobs that must NOT drift while doing so.
 *
 * Negative assertions run against executable source with comments stripped:
 * the files necessarily name the settings they avoid in order to explain them.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

/** Executable source: block comments, line comments and doc prose removed. */
function executable(path: string): string {
  return readFileSync(new URL(path, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
    .join("\n")
}

const config = executable("../playwright.config.ts")
const spec08 = executable("./specs/08-career-competency-expectation.spec.ts")

test("a hosted failure retains a trace without needing a retry", () => {
  assert.match(config, /trace:\s*"retain-on-failure"/)

  // The mode that lost run 260907120642-8774b5's evidence must not come back.
  assert.doesNotMatch(config, /trace:\s*"on-first-retry"/)
  assert.doesNotMatch(config, /trace:\s*"off"/)
})

test("diagnosability was not bought by weakening the run contract", () => {
  // Retries unchanged: a retry would re-drive real mutations against Review and
  // can mask a genuine intermittent product fault as a pass.
  assert.match(config, /retries:\s*process\.env\.CI\s*\?\s*1\s*:\s*0/)

  // Determinism unchanged: the suite depends on ordered, single-worker state.
  assert.match(config, /workers:\s*1/)
  assert.match(config, /fullyParallel:\s*false/)

  // Video stays off. It is heavy and it records the password keystroke by
  // keystroke during login; the trace already carries what diagnosis needs.
  assert.match(config, /video:\s*"off"/)
})

test("spec 08 proves the write was accepted before it trusts a reload", () => {
  // The failure in run 260907120642-8774b5 could not be attributed: the matrix
  // was empty after reload, and nothing in the spec distinguished "the write
  // was rejected" from "the readback is wrong". The submit now has to produce
  // the product's own success signal first.
  assert.match(spec08, /SAVE_SUCCESS_MESSAGE/)
  assert.match(spec08, /Expectativa de competência salva\./)

  // The success evidence must come BEFORE the reload, otherwise it proves
  // nothing the durable assertion does not already cover.
  const submitAt = spec08.indexOf('name: "Salvar expectativa"')
  const evidenceAt = spec08.indexOf("SAVE_SUCCESS_MESSAGE, { exact: true }")
  const reloadAt = spec08.indexOf("page.reload()", submitAt)
  assert.ok(submitAt > 0 && evidenceAt > submitAt, "success evidence must follow the submit")
  assert.ok(reloadAt > evidenceAt, "success evidence must precede the reload")

  // The durable readback is still required — immediate feedback never replaces
  // server-backed proof.
  assert.match(spec08, /Editar \$\{competency\} no perfil \$\{seniority\}\. Personalizado\./)
})
