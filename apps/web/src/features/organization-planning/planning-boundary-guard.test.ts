/**
 * Consumer guard for the Organization Planning trusted boundary.
 *
 * PLN-SEC0 established that Planning's authorization lives in RLS and its
 * transactional semantics in invoker-rights RPCs. PLN-P5A/P5B moved change-set
 * mutation onto the `0138` `*_v1` RPCs. The risk this guard exists to catch is
 * not a bug in what was written — it is a retired boundary quietly reappearing
 * on the ACTIVE path later, which no unit test would notice because each unit
 * test only sees the module it imports.
 *
 * Scope: the active path only. Inner-layer leftovers that nothing wires to a
 * surface are out of scope by design; this guard asserts what is REACHABLE, and
 * fails if a retired path becomes reachable again.
 */

import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import test from "node:test"

const feature = resolve(import.meta.dirname)

/** Every source file under the feature, excluding tests. */
function activeSources(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === "__tests__" || entry === "tests") continue
      activeSources(full, acc)
      continue
    }
    if (!/\.tsx?$/.test(entry)) continue
    if (/\.test\.tsx?$/.test(entry)) continue
    acc.push(full)
  }
  return acc
}

const sources = activeSources(feature)
const rel = (file: string) => file.slice(feature.length + 1)

/** Comments name what the code avoids; properties must hold in code. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

test("the active path never reaches a planning relation by direct table access", () => {
  // Reads and writes both: `get_planning_change_sets_v1` is the canonical read,
  // and the `0138` RPCs are the canonical mutations.
  const relations = [
    "organization_planning_change_sets",
    "organization_planning_scenarios",
    "organization_planning_snapshots",
    "organization_planning_workspaces",
  ]
  const offenders: string[] = []
  for (const file of sources) {
    const body = code(readFileSync(file, "utf8"))
    for (const relation of relations) {
      if (new RegExp(`\\.from\\(\\s*["'\`]${relation}["'\`]`).test(body)) {
        offenders.push(`${rel(file)} → .from("${relation}")`)
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `direct table access is retired; these reach a relation directly:\n${offenders.join("\n")}`,
  )
})

test("change-set mutation is reachable only through the 0138 RPCs", () => {
  const adapter = readFileSync(
    join(feature, "repositories/planning-change-set-repository-adapter.ts"),
    "utf8",
  )
  for (const rpc of [
    "create_planning_change_set_v1",
    "replace_planning_change_set_v1",
    "remove_planning_change_set_v1",
    "reorder_planning_change_sets_v1",
    "get_planning_change_sets_v1",
  ]) {
    assert.match(adapter, new RegExp(rpc), `${rpc} must be the boundary`)
  }

  // No other module may call those RPCs: the adapter is the single seam.
  const callers = sources.filter(
    (file) =>
      /_planning_change_set(s)?_v1/.test(code(readFileSync(file, "utf8"))) &&
      !file.endsWith("planning-change-set-repository-adapter.ts"),
  )
  assert.deepEqual(callers.map(rel), [], "the change-set RPCs must have exactly one caller")
})

test("no retired planning boundary is reachable from the active path", () => {
  // Retired by earlier slices. Their inner-layer leftovers may still exist, but
  // nothing on the active path may export or invoke them again.
  const retired = [
    "archiveScenarioAction",
    "restoreScenarioAction",
    "PLANNING_CHANGE_SET_CREATE_RETIRED",
  ]
  const actionsIndex = readFileSync(join(feature, "actions/index.ts"), "utf8")
  for (const symbol of retired) {
    assert.doesNotMatch(
      actionsIndex,
      new RegExp(symbol),
      `${symbol} is retired and must not be re-exported as a server action`,
    )
  }

  // And no surface may import them.
  const surfaces = sources.filter((file) => file.endsWith(".tsx"))
  for (const file of surfaces) {
    const body = code(readFileSync(file, "utf8"))
    for (const symbol of retired) {
      assert.doesNotMatch(body, new RegExp(symbol), `${rel(file)} reaches retired ${symbol}`)
    }
  }
})

test("every content mutation carries an expected version", () => {
  // Optimistic concurrency is the boundary's contract. An action that omitted
  // it would fail closed in the database, but only at runtime — this makes the
  // omission visible at build time instead.
  const actions = readFileSync(join(feature, "actions/planning-content-actions.ts"), "utf8")
  assert.match(actions, /expectedVersion: z\.number\(\)\.int\(\)\.positive\(\)/)

  const service = readFileSync(
    join(feature, "application/services/planning-content-editor-service.ts"),
    "utf8",
  )
  for (const method of ["createDepartment", "replaceDepartment", "remove", "reorder"]) {
    assert.match(service, new RegExp(`async ${method}\\(`), `${method} must exist`)
  }
  assert.match(service, /expectedVersion: number/)
})

test("content mutations are authorized and answer with canonical state", () => {
  const actions = readFileSync(join(feature, "actions/planning-content-actions.ts"), "utf8")

  // The permission vocabulary PLN-SEC0 found declared-but-unenforced is now
  // enforced on the authoring path.
  assert.match(actions, /PERMISSION_CATALOG\.ORGANIZATION_PLANNING_MANAGE/)
  assert.match(actions, /requirePermission/)

  // A toast is a claim; the readback is the fact.
  const service = readFileSync(
    join(feature, "application/services/planning-content-editor-service.ts"),
    "utf8",
  )
  assert.match(service, /private async readCanonical/)
  assert.match(service, /listPublishableByScenario/)
  assert.ok(
    (service.match(/return this\.readCanonical\(/g) ?? []).length >= 4,
    "every mutation must answer with canonical scenario + change-set state",
  )
})

test("only department.create is authorable; other change types stay read-only", () => {
  // The editor renders authoring controls from the view model, so the filter in
  // the read service is what keeps unsupported change types uneditable.
  const readService = readFileSync(
    join(feature, "application/services/planning-read-application-service.ts"),
    "utf8",
  )
  assert.match(readService, /changeSet\.changeType !== "department\.create"/)

  const actions = readFileSync(join(feature, "actions/planning-content-actions.ts"), "utf8")
  const changeTypes = [...actions.matchAll(/changeType:\s*"([^"]+)"/g)].map((m) => m[1])
  for (const changeType of changeTypes) {
    assert.equal(changeType, "department.create", "only department.create may be authored")
  }
})

test("the editor is offered only while the scenario is a draft", () => {
  const page = readFileSync(join(feature, "planning-dashboard/planning-dashboard-page.tsx"), "utf8")
  assert.match(page, /scenario\.status === "draft"/)
  assert.match(page, /<PlanningContentEditor/)
})
