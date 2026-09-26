/**
 * L-E2E10 — the Development interaction contract is shared, not re-derived.
 *
 * Four consecutive hosted runs were spent on spec 17 rediscovering interaction
 * rules spec 15 already encodes:
 *
 *   260925123224-c554b8  formal Feedback navigation
 *   260925133926-18822f  column identity
 *   260925145819-cf9357  template entity identity
 *   260925153205-e99eb4  goal <details> gating — "Iniciar ação" while collapsed
 *
 * Each was individually cheap and the class was not. These guards hold the
 * contract in one place: the interaction helpers live in e2e/helpers, both specs
 * consume them, and neither may define its own copy again.
 *
 * Everything is judged on comment-stripped CODE. Guards in this repository have
 * twice matched their own prose, and once been satisfied by an unrelated field.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const read = (relative: string) =>
  readFileSync(resolve(import.meta.dirname, relative), "utf8")

/** Strip line comments so prose can never satisfy a structural assertion. */
function codeOf(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/\s*\/\/.*$/, ""))
    .join("\n")
}

const HELPER_PATH = "helpers/development-interactions.ts"
const SPECS = [
  ["spec 15", "specs/15-development-journey.spec.ts"],
  ["spec 17", "specs/17-leadership-journey.spec.ts"],
] as const

/** Action controls that only exist inside an expanded goal disclosure. */
const ACTION_CONTROLS = ["Iniciar ação", "Concluir ação", "Ignorar ação"] as const

/**
 * Only real INTERACTIONS count. Spec 15 also lists these same labels in an
 * assertion that they are ABSENT for an unauthorized actor; treating a mention as
 * an interaction would flag a correct spec, which is how three earlier guards in
 * this repository refused legitimate content.
 */
const INTERACTION_RE = new RegExp(
  `getByRole\\("button",\\s*\\{\\s*name:\\s*"(?:${ACTION_CONTROLS.join("|")})"[^}]*\\}\\)\\s*\\.click\\(\\)`,
  "g",
)

function interactionSites(code: string): Array<{ index: number; text: string }> {
  return [...code.matchAll(INTERACTION_RE)].map((m) => ({ index: m.index ?? 0, text: m[0] }))
}

test("the shared interaction helper exists and owns the disclosure semantics", () => {
  const helper = codeOf(read(HELPER_PATH))

  for (const name of ["openDialog", "expandGoal", "actionCard", "openPlanGoal"]) {
    assert.match(helper, new RegExp(`export (async )?function ${name}\\b`), `${name} must be shared`)
  }

  // The disclosure rule itself, not merely a click: idempotent, and asserted.
  assert.match(helper, /locator\("details"\)/)
  assert.match(helper, /locator\("summary"\)\.click\(\)/)
  assert.match(helper, /toHaveJSProperty\("open", true\)/)
  // The dialog is a portal, looked up from the page rather than the trigger scope.
  assert.match(helper, /getByRole\("dialog"\)/)
})

test("neither spec re-declares a shared interaction helper", () => {
  for (const [label, path] of SPECS) {
    const code = codeOf(read(path))
    for (const name of ["openDialog", "expandGoal", "actionCard", "openPlanGoal"]) {
      assert.doesNotMatch(
        code,
        new RegExp(`(async )?function ${name}\\s*\\(`),
        `${label} must import ${name} instead of declaring its own`,
      )
    }
    assert.match(
      code,
      /from "\.\.\/helpers\/development-interactions"/,
      `${label} must consume the shared helper`,
    )
  }
})

test("every action control is reached only after the goal disclosure is expanded", () => {
  for (const [label, path] of SPECS) {
    const code = codeOf(read(path))
    const sites = interactionSites(code)
    assert.ok(sites.length > 0, `${label}: expected at least one action interaction`)
    for (const site of sites) {
      const before = code.slice(0, site.index)
      const expanded = Math.max(before.lastIndexOf("openPlanGoal"), before.lastIndexOf("expandGoal"))
      assert.ok(expanded >= 0, `${label}: ${site.text} has no goal expansion before it`)
      // Nothing may re-collapse the disclosure between expanding and clicking.
      assert.doesNotMatch(
        before.slice(expanded),
        /\.(reload|goto)\(/,
        `${label}: a render/reload happens between expanding the goal and ${site.text}`,
      )
    }
  }
})

test("action controls are scoped to their action card, never to the page", () => {
  for (const [label, path] of SPECS) {
    const code = codeOf(read(path))
    for (const site of interactionSites(code)) {
      const lineStart = code.lastIndexOf("\n", site.index) + 1
      // site.index starts at `getByRole`, so the receiver keeps the member dot.
      const receiver = code.slice(lineStart, site.index).trimEnd().replace(/\.$/, "")
      // The invariant is the RECEIVER, not a literal call. Spec 15 scopes through a
      // variable holding actionCard(...), which is equally correct; demanding the
      // call inline would refuse a correct spec.
      assert.doesNotMatch(
        receiver,
        /(^|[^.\w])page\s*$/,
        `${label}: ${site.text} is located on the page; it must be scoped to its action card`,
      )
      assert.ok(
        receiver.length > 0,
        `${label}: ${site.text} has no scope receiver at all`,
      )
    }
  }
})

test("a reload or navigation is followed by a fresh expansion before interacting again", () => {
  for (const [label, path] of SPECS) {
    const code = codeOf(read(path))
    const marks = [...code.matchAll(/\.(reload|goto)\(/g)].map((m) => m.index ?? 0)
    for (const mark of marks) {
      const after = code.slice(mark)
      const sites = interactionSites(after)
      const nextControl = sites.length > 0 ? sites[0].index : Number.MAX_SAFE_INTEGER
      if (nextControl === Number.MAX_SAFE_INTEGER) continue
      const nextExpand = Math.min(
        ...["openPlanGoal", "expandGoal"].map((h) => {
          const i = after.indexOf(h)
          return i === -1 ? Number.MAX_SAFE_INTEGER : i
        }),
      )
      assert.ok(
        nextExpand < nextControl,
        `${label}: an action control is used after a render/reload with no re-expansion`,
      )
    }
  }
})
