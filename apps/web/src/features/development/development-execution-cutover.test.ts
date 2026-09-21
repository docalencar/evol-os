import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const root = new URL("./", import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), "utf8")

test("application mutations use the D-DB1 trusted boundaries and canonical rereads", () => {
  const actions = read("repositories/development-action-repository.ts")
  const reviews = read("repositories/development-review-repository.ts")
  const plans = read("repositories/development-plan-repository.ts")
  for (const rpc of ["start_development_action_v1", "complete_development_action_v1", "skip_development_action_v1"]) assert.match(actions, new RegExp(rpc))
  assert.match(actions, /const canonical = await read/)
  assert.match(actions, /authoritative\.plan_id !== planId/)
  assert.match(reviews, /record_development_review_v1/)
  assert.match(reviews, /return findByPlan/)
  assert.match(plans, /complete_development_plan_v1/)
  assert.match(plans, /return findById/)
})

test("the active product has no generic reopen transition surface", () => {
  const index = read("index.ts")
  const table = read("components/development-plan-table.tsx")
  assert.doesNotMatch(index + table, /changeDevelopmentPlanStatus|Reabrir|completed[^]*active|cancelled[^]*active/)
})
