import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { mapDevelopmentPlan } from "./repositories/development-plan-repository"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const planRepository = read("./repositories/development-plan-repository.ts")
const goalRepository = read("./repositories/development-goal-repository.ts")
const actionRepository = read("./repositories/development-action-repository.ts")
const dashboard = read("./services/get-development-executive-dashboard.ts")
const planList = read("./services/get-development-plan-list-items.ts")
const developmentPage = read("../../app/(dashboard)/app/development/page.tsx")
const planPage = read("../../app/(dashboard)/app/development/plans/[id]/page.tsx")
const peoplePage = read("../../app/(dashboard)/app/people/[id]/page.tsx")
const trustedMigration = read("../../../../../supabase/migrations/0130_create_development_trusted_lifecycle_boundary.sql")
const trustedTests = read("../../../../../supabase/tests/development_trusted_lifecycle_boundary.test.sql")

test("canonical plan mapping preserves DB-derived action counts and progress", () => {
  const plan = mapDevelopmentPlan({
    plan_id: "plan",
    employee_id: "employee",
    owner_id: "owner",
    template_id: null,
    title: "Plano",
    description: null,
    status: "active",
    priority: "high",
    start_date: null,
    due_date: null,
    completed_at: null,
    version: 3,
    total_actions: 4,
    completed_actions: 1,
    skipped_actions: 2,
    progress_percent: 75,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
  }, "company")

  assert.equal(plan.totalActions, 4)
  assert.equal(plan.completedActions, 1)
  assert.equal(plan.skippedActions, 2)
  assert.equal(plan.progressPercent, 75)

  const emptyPlan = mapDevelopmentPlan({
    plan_id: "empty-plan",
    employee_id: "employee",
    owner_id: null,
    template_id: null,
    title: "Plano vazio",
    description: null,
    status: "draft",
    priority: "medium",
    start_date: null,
    due_date: null,
    completed_at: null,
    version: 1,
    total_actions: 0,
    completed_actions: 0,
    skipped_actions: 0,
    progress_percent: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  }, "company")

  assert.equal(emptyPlan.progressPercent, 0)
})

test("active Development routes delegate reads to D-DB1 trusted boundaries", () => {
  assert.match(planRepository, /get_authorized_development_plans_v1/)
  assert.match(goalRepository, /get_authorized_development_goals_v1/)
  assert.match(actionRepository, /get_authorized_development_actions_v1/)
  assert.match(dashboard, /getDevelopmentPlanListItems\(companyId\)/)
  assert.match(planPage, /getDevelopmentPlanById\(companyId, id\)/)
  assert.match(planPage, /getDevelopmentGoalsByPlan\(companyId, id\)/)
  assert.match(planPage, /getDevelopmentActionsByPlan\(companyId, id\)/)
  assert.match(peoplePage, /getDevelopmentPlansByEmployee\(companyId, id\)/)

  for (const source of [dashboard, planPage, peoplePage]) {
    assert.doesNotMatch(source, /getManagementDevelopment(?:Plans|Goals|Actions)/)
  }
})

test("trusted boundary remains the only actor visibility authority", () => {
  assert.match(trustedMigration, /can_read_development_plan_v1\(plan\.id\)/)
  assert.match(trustedTests, /manager reads direct report/)
  assert.match(trustedTests, /subject reads own plan/)
  assert.match(trustedTests, /same-company nonparticipant denied/)
  assert.match(trustedTests, /administrative owner reads tenant plan/)
  assert.match(trustedTests, /foreign tenant denied/)
  assert.doesNotMatch(
    developmentPage + planPage + peoplePage,
    /manager_id\s*===|currentUser\.id\s*===|employeeId\s*===\s*currentUser/,
  )
})

test("plan detail is non-oracular and canonical progress is never recomputed", () => {
  assert.match(planPage, /if \(!plan\)\s*{\s*notFound\(\)/)
  assert.match(planPage, /plan\.progressPercent/)
  assert.match(planPage, /plan\.completedActions/)
  assert.match(planPage, /plan\.skippedActions/)
  assert.match(planPage, /plan\.totalActions/)
  assert.match(planList, /progress: plan\.progressPercent/)
  assert.doesNotMatch(
    planPage + planList + dashboard,
    /Math\.round|completedActions\s*\/|status === ["']completed["']\)\.length/,
  )
})

test("D-P2 does not add prohibited Development mutation surfaces", () => {
  const changedReadSurfaces = developmentPage + planPage + peoplePage
  assert.doesNotMatch(
    changedReadSurfaces,
    /startDevelopmentAction|completeDevelopmentAction|skipDevelopmentAction|recordDevelopmentReview|publishDevelopmentTemplate/,
  )
})
