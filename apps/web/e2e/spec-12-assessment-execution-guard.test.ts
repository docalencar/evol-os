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

/**
 * STRUCTURAL: a URL is never the last word on a navigation.
 *
 * Hosted run 260910000901-890ae9 failed here. `waitForURL` was satisfied on the
 * cycle-detail URL while the document was still the assessments home — App
 * Router pushes the URL and keeps the previous tree on screen until the
 * destination resolves, and there is no `loading.tsx` under `app/assessments`
 * to interrupt that. The spec then drove "Adicionar participantes" against a
 * page that had never rendered, and reported a missing product control.
 *
 * The class, not that instance: after any `waitForURL`, the next thing spec 12
 * does must be an assertion, never an action. Written on indices rather than
 * line windows because these waits span several lines.
 */
test("no navigation in spec 12 is trusted on the URL alone", () => {
  const offenders: string[] = []
  const wait = /page\.waitForURL\(/g

  for (let match = wait.exec(source); match; match = wait.exec(source)) {
    const after = source.slice(match.index + match[0].length)
    const assertAt = after.indexOf("expect(")
    const actAt = after.indexOf(".click()")

    if (actAt !== -1 && (assertAt === -1 || actAt < assertAt)) {
      const line = source.slice(0, match.index).split("\n").length
      offenders.push(
        `line ${line}: the first thing after this waitForURL is ${after
          .slice(0, actAt + 8)
          .split("\n")
          .filter((text) => text.trim() !== "")
          .pop()
          ?.trim()}`
      )
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `A URL proves the router changed its mind, not that the destination is on ` +
      `screen. Assert the surface — the H1 the page renders — before acting on ` +
      `it, or a pending navigation is silently charged to the next action's ` +
      `timeout and reported as a missing control:\n` + offenders.join("\n")
  )
})

test("the cycle detail is proven by the run's own cycle name", () => {
  // Surface is not enough on its own: any heading assertion would satisfy the
  // structural guard above. The cycle page's H1 is `cycle.name`, so this is
  // what separates "a cycle rendered" from "OUR cycle rendered".
  const start = source.indexOf("async function openResultCycleDetail")
  assert.notEqual(start, -1, "spec 12 must still reach the cycle detail through a helper")
  const body = source.slice(start, source.indexOf("\n}", start))

  assert.match(
    body,
    /getByRole\("heading", \{ level: 1, name: assessmentResultCycleName\(manifest\(\)\.runId\) \}\)/,
    "the helper must prove the destination H1 is this run's cycle"
  )
})

/**
 * STRUCTURAL: spec 12 never re-navigates to the page it is already on.
 *
 * Hosted runs 260910000901-890ae9 and 260910160422-9ffd9e failed on the same
 * navigation, and the second trace named the cause. `openAssessmentsHome` was
 * called from `/app/assessments`, so its sidebar click started a transition to
 * the page already on screen — a transition neither of its waits can see: the
 * URL never changes, and the H1 it asserts is already rendered by the page being
 * replaced. Both returned in 0.00s, the cycle link was clicked 36ms later, and
 * two client navigations ran at once. The router finished holding the cycle URL
 * over the home's tree, silent, with nothing left to reconcile.
 *
 * Every other navigation-helper call in the suite runs from `/app` right after a
 * login and is a real navigation. This was the only one that was not, and it is
 * the only one that has ever failed.
 */
test("spec 12 never re-navigates to the page it is already on", () => {
  const start = source.indexOf("async function openAssessmentsHome")
  assert.notEqual(start, -1, "spec 12 must still reach the assessments home through a helper")
  const body = source.slice(start, source.indexOf("\n}", start))

  assert.match(
    body,
    /if \(!isOn\(page, ASSESSMENTS_HOME_PATH\)\) \{[\s\S]*?name: "Avaliações" \}\)\.click\(\)/,
    "the sidebar click must be skipped when the page is already the assessments home"
  )
  assert.match(source, /new URL\(page\.url\(\)\)\.pathname === path/)
})

test("the assessments home wait cannot be satisfied by a page under it", () => {
  // `/app/assessments(\/|\?|$)` matches `/app/assessments/cycles/<id>` too, so
  // leaving a cycle detail for the home would resolve it before the transition
  // even started. Written as literal text because the pattern is what is pinned.
  assert.ok(
    source.includes("assessments(\\?|$)"),
    "the home wait must match the home itself"
  )
  assert.ok(
    !source.includes("assessments(\\/|\\?|$)"),
    "the prefix form of the home wait is satisfied by every page under the home"
  )
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
