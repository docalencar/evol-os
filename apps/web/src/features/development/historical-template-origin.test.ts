/**
 * D-P3 reconciliation — "Template de origem" is historical, and reads that way.
 *
 * Every module involved is server-only or a `"use client"` component, so none can
 * be imported into a plain node test process. What IS pinned here is the chain the
 * origin label must travel and the specific shapes that would quietly undo it: the
 * current catalog returning as a historical source, `plan.templateId` reappearing
 * as a fallback, a fabricated name standing in for missing history, or a per-plan
 * lookup turning a set-based read into N+1.
 *
 * The property behind all of them: a template that is obsoleted, or superseded by
 * a newer version, must not change what an existing plan records about where it
 * came from.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

const originRead = read("./queries/get-development-plan-origins.ts")
const planList = read("./services/get-development-plan-list-items.ts")
const planForm = read("./components/development-plan-form.tsx")
const planTable = read("./components/development-plan-table.tsx")
const editDialog = read("./components/development-plan-edit-dialog.tsx")
const planPage = read("../../app/(dashboard)/app/development/plans/[id]/page.tsx")
const listItemTypes = read("./types/development-plan-list-item.ts")

/** Comments necessarily discuss what the code avoids; properties hold in code. */
const code = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

test("1. the origin reader goes through the trusted 0133 boundary and nothing else", () => {
  assert.match(originRead, /get_authorized_development_plan_origins_v1/)
  assert.match(originRead, /import "server-only"/)
  // Exactly the five columns the migration returns, mapped once.
  for (const column of [
    "plan_id",
    "template_id",
    "template_version_id",
    "template_name",
    "template_version_number",
  ]) {
    assert.match(originRead, new RegExp(`\\b${column}\\b`), `${column} must be mapped`)
  }
  // Company identity comes from the server caller; the plan selector is optional,
  // which is what makes the set-based read possible.
  assert.match(originRead, /p_company_id: companyId/)
  assert.match(originRead, /p_plan_id: planId \?\? null/)
})

test("2. the app never reads the ledger directly, and never rebuilds history from the catalog", () => {
  const active = code(originRead + planList)
  // The lineage and snapshot tables are readable by any tenant member under
  // inherited RLS. The application must still not touch them: the RPC is
  // narrower, and going around it would re-widen what D-DB2 deliberately closed.
  assert.doesNotMatch(active, /development_template_application_lineage/)
  assert.doesNotMatch(active, /development_template_application_snapshots/)
  assert.doesNotMatch(active, /\.from\(/)
  assert.doesNotMatch(active, /service_role|SUPABASE_SERVICE_ROLE_KEY/)
  // And the current catalog is not a historical source.
  assert.doesNotMatch(active, /getPublishedDevelopmentTemplateCatalog/)
  assert.doesNotMatch(active, /get_published_development_template_catalog_v1/)
  assert.doesNotMatch(active, /getManagementDevelopmentTemplates/)
})

test("3. an obsoleted or superseded template does not degrade the recorded origin", () => {
  // This is the regression the whole slice exists to prevent. The list asks the
  // historical boundary, which reads immutable lineage and snapshot, so a
  // template's CURRENT lifecycle state cannot reach this value at all. There is
  // no status, active flag or version filter anywhere on the path.
  assert.match(planList, /getDevelopmentPlanOrigins\(companyId\)/)
  const active = code(planList)
  assert.doesNotMatch(active, /status\s*===\s*["']published["']/)
  assert.doesNotMatch(active, /\.active\b/)
})

test("4. plan.templateId is never a historical fallback", () => {
  // Migration 0011 declared that column `on delete set null`. It cannot carry
  // history, and reaching for it when the boundary returns nothing would
  // reintroduce exactly the bug this slice fixes.
  const active = code(planList)
  assert.doesNotMatch(active, /plan\.templateId/)
  assert.match(active, /originNameByPlanId\.get\(plan\.id\)/)
})

test("5. absence is rendered as absence — the fabricated label is gone", () => {
  // "Template não disponível" asserted something false: that the origin was
  // unavailable, when in fact it was never looked up.
  const originPath = code(planList + planForm + planTable + editDialog + originRead)
  assert.doesNotMatch(originPath, /Template não disponível/)
  // No row means no recorded origin, which the form states plainly.
  assert.match(planList, /originNameByPlanId\.get\(plan\.id\) \?\? null/)
  assert.match(planForm, /"Sem template de origem"/)
  assert.match(listItemTypes, /templateName: string \| null/)
})

test("6. the list read is set-based, not one call per plan", () => {
  // One call, resolved alongside the other list reads. If it ever moved inside
  // the row mapping, this ordering assertion fails.
  assert.equal((planList.match(/getDevelopmentPlanOrigins\(/g) ?? []).length, 1)
  const call = planList.indexOf("getDevelopmentPlanOrigins(companyId)")
  const promiseAll = planList.indexOf("await Promise.all([")
  const rowMapping = planList.indexOf("plans.map((plan)")
  assert.ok(promiseAll !== -1 && call > promiseAll, "the origin read joins the parallel reads")
  assert.ok(call < rowMapping, "the origin read must not sit inside the per-plan mapping")
  // The join is a Map lookup, so it stays O(1) per row rather than a find().
  assert.match(planList, /new Map\(\s*origins\.map/)
})

test("7. authorization stays in the database on this path too", () => {
  // The boundary applies can_read_development_plan_v1 per returned row. The
  // application must not restate that matrix, and must not filter for privacy
  // in the browser — the join below narrows presentation only, over two sets
  // that were each already authorized.
  const active = code(planList + originRead)
  assert.doesNotMatch(
    active,
    /role === ["'](owner|admin|hr|manager|employee)["']|membershipRole|has_company_role/,
  )
  assert.doesNotMatch(active, /can_read_development_plan_v1/)
  for (const source of [planTable, editDialog, planForm]) {
    assert.doesNotMatch(
      code(source),
      /role === ["'](owner|admin|hr|manager|employee)["']|membershipRole/,
    )
  }
})

test("8. the detail surface gains no origin oracle", () => {
  // The plan detail page does not render origin and this slice does not add it.
  // If it ever does, it must come from the same boundary — an origin lookup that
  // answered for a plan the viewer cannot read would be an oracle, and the
  // existing notFound contract is what keeps unauthorized and nonexistent
  // indistinguishable.
  assert.doesNotMatch(code(planPage), /getDevelopmentPlanOrigins|templateName/)
  assert.match(planPage, /if \(!plan\)\s*{\s*notFound\(\)/)
})
