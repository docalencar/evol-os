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
import { readdirSync, readFileSync } from "node:fs"
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

/**
 * STRUCTURAL: no spec may reload straight after a click.
 *
 * Run 260907175655-ecd9b6 lost two tests to the same shape. In spec 08 the
 * reload fired 1.6ms after the server action's POST began and aborted it in
 * flight (status -1); in spec 09 it fired 2.7ms after, so the navigation
 * fetched server-rendered HTML from before the write committed. Neither was a
 * product fault, and neither test noticed for 30 seconds.
 *
 * A previous slice fixed one instance of this and left two behind, because the
 * guard pinned that instance rather than the class. This scans every spec and
 * flags the signature directly: a `page.reload()` whose preceding executable
 * line is a `.click()`.
 *
 * It is deliberately narrow. A click that navigates is normally followed by a
 * `waitForURL` or an assertion, so it does not trip; and a click followed
 * immediately by a reload is suspicious whether or not it mutates — there is
 * nothing to gain by discarding the page before observing anything.
 */
test("no spec reloads immediately after a click, with no evidence in between", () => {
  const specsDir = new URL("./specs/", import.meta.url)
  const offenders: string[] = []

  for (const file of readdirSync(specsDir).filter((name) => name.endsWith(".spec.ts"))) {
    const lines = readFileSync(new URL(file, specsDir), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("//") && !line.startsWith("*"))

    lines.forEach((line, index) => {
      if (!/page\.reload\(\)/.test(line)) return
      const previous = lines[index - 1] ?? ""
      if (/\.click\(\)/.test(previous)) {
        offenders.push(`${file}: reload directly after ${previous.slice(0, 70)}`)
      }
    })
  }

  assert.deepEqual(
    offenders,
    [],
    `A reload immediately after a click races the write it was meant to persist. ` +
      `Assert the product's own success signal first (toast text from the action, ` +
      `and the dialog closing), then reload for the durable readback:\n` +
      offenders.join("\n")
  )
})

/**
 * Submit controls whose success contract is known and asserted.
 *
 * Deliberately an explicit list rather than a heuristic. "Is this click a
 * mutation?" is not decidable from the locator text alone: `Adicionar
 * competência` is both a dialog trigger and a form submit, and `Nova
 * senioridade` only opens a dialog. A pattern broad enough to catch every
 * mutation would flag every trigger too, and a guard that cries wolf gets
 * disabled.
 *
 * LIMITATION, stated rather than hidden: specs 05 and 06 create departments,
 * positions, teams and people without asserting a primary success signal, so
 * they carry the same latent risk and are NOT covered here. Closing them is
 * out of scope for this slice; adding their controls to this list is the whole
 * change needed when that is authorised.
 */
const SUBMIT_CONTROLS: readonly string[] = [
  "Criar competência",
  "Criar senioridade",
  "Aplicar",
  "Salvar expectativa",
  "Salvar alterações",
  // Assessment catalog and cycle (spec 11). Same contract: each of these is the
  // control that actually posts, so each must prove the product's own success
  // message and its dialog closing before anything waits on a list.
  "Criar modelo",
  "Criar seção",
  "Criar pergunta",
  "Criar ciclo",
  "Adicionar selecionados",
  // Assessment execution (spec 12). The confirmation button inside the submit
  // dialog is the control that actually posts, so it carries the same contract.
  // `Gerar avaliações` is deliberately NOT here: it is a plain button with no
  // dialog to close, and spec 12's own guard covers its success-then-readback
  // ordering instead.
  "Confirmar envio",
]

/** Executable lines of a spec, comments and blanks removed. */
function executableLines(file: string): string[] {
  return readFileSync(new URL(`./specs/${file}`, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("//") && !line.startsWith("*"))
}

test("every known submit proves success before waiting on a secondary effect", () => {
  // Run 260907184219-ec1320 lost spec 08 to this exact shape: the create POST
  // hung (status -1, dialog still open) and the spec spent its whole budget
  // waiting for a row to appear in a list. A list row is a *secondary* effect —
  // it needs the action to return, revalidatePath to fire and the page to
  // re-render. The toast and the dialog closing are the *primary* signal.
  const offenders: string[] = []

  for (const file of readdirSync(new URL("./specs/", import.meta.url)).filter((n) =>
    n.endsWith(".spec.ts")
  )) {
    const lines = executableLines(file)

    lines.forEach((line, index) => {
      if (!line.includes(".click()")) return
      const control = SUBMIT_CONTROLS.find((name) => line.includes(`"${name}"`))
      if (!control) return

      // A submit must be followed, within the next few executable lines, by the
      // product's own success message and by the dialog disappearing.
      const window = lines.slice(index + 1, index + 9).join(" ")
      const hasMessage = /SUCCESS_MESSAGE/.test(window)
      const hasClose = /toBeHidden/.test(window)
      if (!hasMessage || !hasClose) {
        offenders.push(
          `${file}: "${control}" submit lacks ${
            !hasMessage ? "a success-message assertion" : "a dialog-close assertion"
          }`
        )
      }
    })
  }

  assert.deepEqual(
    offenders,
    [],
    `A submit must assert the product's own success signal — the exact toast text ` +
      `from the action, plus the dialog closing — before any list readback or ` +
      `reload. Waiting only on a secondary effect turns a hung write into a ` +
      `misleading "not found" after a full timeout:\n` + offenders.join("\n")
  )
})

test("opening a dialog is not mistaken for a submit", () => {
  // The guard must stay quiet on triggers, or it becomes noise and gets ignored.
  // These open dialogs and are correctly followed by a heading assertion, not by
  // a success message.
  const spec08 = executableLines("08-career-competency-expectation.spec.ts").join(" ")

  for (const trigger of [
    "Nova Competência",
    "Nova senioridade",
    "Adicionar senioridade",
    "Adicionar competência à matriz",
  ]) {
    // The trigger really is clicked by the spec — otherwise this test would be
    // asserting against names that no longer exist and would quietly rot.
    assert.ok(
      spec08.includes(`"${trigger}"`),
      `"${trigger}" is expected to appear in spec 08; update this list if the UI changed`
    )
    assert.ok(
      !SUBMIT_CONTROLS.includes(trigger),
      `"${trigger}" opens a dialog and must never be treated as a submit`
    )
  }
})

test("the seniority dialog uses keyboard activation and proves readiness", () => {
  const start = spec08.indexOf('test("a Seniority is created')
  assert.notEqual(start, -1, "spec 08 must retain the Seniority journey")
  const next = spec08.indexOf('\n  test("', start + 1)
  const body = spec08.slice(start, next === -1 ? spec08.length : next)

  const activationAt = body.indexOf(
    'getByRole("button", { name: "Nova senioridade", exact: true }).press("Enter")'
  )
  const readinessAt = body.indexOf(
    'expect(page.getByRole("heading", { name: "Nova senioridade" })).toBeVisible()'
  )

  assert.ok(activationAt >= 0, "the Base UI trigger must use accessible keyboard activation")
  assert.ok(readinessAt > activationAt, "the opened dialog must be proven after activation")
  assert.doesNotMatch(body, /force:\s*true|waitForTimeout|test\.setTimeout/)
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
