/** Static guards for the PLN-P6 hosted Planning harness. No Review access. */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const spec = readFileSync(
  resolve(import.meta.dirname, "specs/16-organization-planning-journey.spec.ts"),
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
  assert.match(step, /testInfo\.attach\("step-6-non-overwrite\.json"/)
})
