/**
 * Contract guard for spec 12 — RUNNER ONLY.
 *
 * Spec 12 is the first spec in this suite where the actor stops being an
 * administrator. That is the claim worth protecting: an ordinary employee finds
 * their own assessment, answers it, submits it, and reads the score the server
 * computed. Every shortcut that would quietly weaken that claim is pinned here —
 * swapping the evaluator for an admin, skipping the discovery CTA, reading back
 * before the write is confirmed, or recomputing the score in TypeScript.
 *
 * Generation is also a one-way door: it writes the immutable 0114 execution
 * snapshot, after which the run can only be retired. The spec must cross it
 * exactly once.
 *
 * ## Comments are stripped first
 *
 * The spec's prose necessarily names the things it avoids — the admin fallback,
 * the formula, the other slices — in order to explain the design. Asserting over
 * raw text would fail on that documentation, a trap this repository has hit
 * before. Every negative assertion below runs against executable source only.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const raw = readFileSync(
  new URL("./specs/12-assessment-execution-result.spec.ts", import.meta.url),
  "utf8"
)

/** Executable source: block comments, line comments and doc prose removed. */
const source = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
  .join("\n")

/** The four proofs that must belong to the employee, not to an administrator. */
const EMPLOYEE_PROOFS = ["9. ", "10. ", "11. ", "12. "]

function bodyOf(title: string): string {
  const start = source.indexOf(`test("${title}`)
  assert.notEqual(start, -1, `spec 12 must still contain the test starting "${title}"`)
  const next = source.indexOf('\n  test("', start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

test("the evaluator is a real employee, never an administrator", () => {
  for (const proof of EMPLOYEE_PROOFS) {
    const body = bodyOf(proof)
    assert.match(
      body,
      /enterAs\(page, "employee"\)/,
      `${proof.trim()} must run as the employee`
    )
    assert.equal(
      /enterAs\(page, "admin"\)/.test(body),
      false,
      `${proof.trim()} must not fall back to an administrator`
    )
  }

  // The admin exists only to arrange and generate.
  assert.match(bodyOf("setup:"), /enterAs\(page, "admin"\)/)
  assert.match(bodyOf("8. "), /enterAs\(page, "admin"\)/)
})

test("the employee reaches the assessment through the discovery CTA", () => {
  // Not by typing a response id into a URL, and not through any administrative
  // page. This is the surface E4-P1 restored, and it is the only way in.
  assert.match(source, /getByRole\("link", \{ name: "Abrir avaliação" \}\)/)
  assert.doesNotMatch(source, /page\.goto\(/)
})

test("spec 12 drives the product and never a privileged client", () => {
  assert.doesNotMatch(source, /adminClient/)
  assert.doesNotMatch(source, /organization-lookup/)
  assert.doesNotMatch(source, /\.from\(|\.rpc\(|\.insert\(|\.update\(|service_role/)
})

test("spec 12 never sleeps for synchronisation", () => {
  assert.doesNotMatch(source, /waitForTimeout|setTimeout|sleep\(/)
})

test("the answer is confirmed saved before anything is read back", () => {
  const body = bodyOf("9. ")

  const clickAt = body.indexOf('getByRole("radio"')
  const savedAt = body.indexOf("ANSWER_SAVED_SIGNAL")
  const reloadAt = body.indexOf("page.reload()")
  const readbackAt = body.indexOf('toHaveAttribute("aria-checked", "true"')

  assert.ok(clickAt > 0, "the answer must be given through the scale control")
  assert.ok(savedAt > clickAt, "the save signal must follow the answer")
  assert.ok(reloadAt > savedAt, "the reload must follow the save signal")
  assert.ok(readbackAt > reloadAt, "the durable readback must follow the reload")

  // Success-only: the same slot renders "Salvando..." and the error text on the
  // other branches, so waiting for the saved signal cannot pass on a failure.
  assert.match(source, /ANSWER_SAVED_SIGNAL = "✔ Salvo"/)
})

test("the submit is confirmed before the submitted state is read back", () => {
  const body = bodyOf("10. ")

  const confirmAt = body.indexOf('name: "Confirmar envio"')
  const successAt = body.indexOf("SUBMIT_SUCCESS_MESSAGE")
  const reloadAt = body.indexOf("page.reload()")

  assert.ok(confirmAt > 0, "submit must go through the confirmation dialog")
  assert.ok(successAt > confirmAt, "the success message must follow the confirmation")
  assert.ok(reloadAt > successAt, "the reload must follow the success message")

  // Immutability is proven by what the product stops offering, not by trying to
  // write and being refused.
  assert.match(body, /toHaveCount\(0\)/)
  assert.match(body, /Escala de resposta/)
  assert.match(body, /Enviar avaliação/)
})

test("the score is read, never recomputed", () => {
  // `response-scale-weighted-v1` lives in the database. A spec that rebuilt it
  // would agree with itself even when the server was wrong, which is the exact
  // failure mode this forbids.
  for (const arithmetic of [
    /\.reduce\(/,
    /\breduce\b/,
    /scaleMax|scale_max/,
    /\bweight\b/,
    /normaliz/i,
    /\baverage\b|\bmedia\b/i,
    /\* *100/,
    /\/ *total/,
  ]) {
    assert.equal(
      arithmetic.test(source),
      false,
      `spec 12 must not contain ${arithmetic} — the score comes from the server`
    )
  }

  // What it does instead: assert the shape of what was rendered.
  assert.match(source, /RENDERED_SCORE = \/\\d\{1,3\},\\d%\//)
  assert.match(bodyOf("11. "), /RENDERED_SCORE/)
})

test("generation happens exactly once and is never undone", () => {
  const generations = source.match(/name: "Gerar avaliações"/g) ?? []
  assert.equal(
    generations.length,
    1,
    "the irreversible snapshot write must be crossed exactly once"
  )

  const body = bodyOf("8. ")
  const clickAt = body.indexOf('name: "Gerar avaliações"')
  const successAt = body.indexOf("GENERATION_SUCCESS_MESSAGE")
  const reloadAt = body.indexOf("page.reload()")
  assert.ok(successAt > clickAt, "generation must prove success before anything else")
  assert.ok(reloadAt > successAt, "the reload must follow the success signal")

  // The perspective is asserted with the count, so a run that generated
  // something other than a self-assessment would not match.
  assert.match(source, /autoavaliação/)
})

test("the assessed person's own result is actually read back", () => {
  // Property 12 is the reason E4-P1 shipped, so it must assert content and not
  // merely that a heading called "Meus resultados" exists — an empty directory
  // renders that heading too.
  const body = bodyOf("12. ")

  assert.match(body, /"Meus resultados"/)
  assert.match(
    body,
    /getByRole\("heading", \{ name: cycle \}\)/,
    "the run's own cycle must be found in the directory"
  )
  assert.match(body, /SUBMITTED_STATUS_LABEL/)
  assert.match(body, /RENDERED_SCORE/)
})

test("spec 12 stays inside its slice", () => {
  // Tenant isolation and non-administrative authorization are E4-S4.
  assert.doesNotMatch(source, /onboardingCompany|resolveAndJournalOnboardingTenant/)
  assert.doesNotMatch(source, /role === "manager"|"onboarding"/)
  assert.match(source, /"admin" \| "employee"/)
})

test("the result cycle is created disclosing, because the S2 cycle cannot be", () => {
  // `assessment_visibility` is locked once a cycle leaves draft, and the result
  // directory (0117) filters out cycles set to `none`. Losing this line would
  // make property 12 silently unprovable.
  assert.match(source, /RESULT_VISIBILITY_LABEL = "Resultado completo"/)
  assert.match(source, /#assessment-visibility[\s\S]{0,120}RESULT_VISIBILITY_LABEL/)
  assert.match(source, /assessmentResultCycleName/)
})
