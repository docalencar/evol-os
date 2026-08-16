import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

import type { Employee } from "../../types/employee"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only"
      ? { shortCircuit: true, url: "server-only:test" }
      : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test"
      ? { format: "module", shortCircuit: true, source: "export {}" }
      : nextLoad(url, context)
  },
})

const loadIntelligence = () => import("./create-employee-intelligence")

const employee: Employee = {
  id: "employee-1", company_id: "company-1", user_id: null,
  full_name: "Ana", email: null, phone: null, birth_date: null,
  hire_date: null, status: "active", manager_id: null, team_id: null,
  position_id: null, disc_profile: null, avatar_url: null,
  created_at: "2026-01-01", updated_at: "2026-01-01",
}

test("createEmployeeIntelligence handles absence of workspace data", async () => {
  const { createEmployeeIntelligence } = await loadIntelligence()
  const result = createEmployeeIntelligence(employee)

  assert.equal(result.assessments.completedAssessments, 0)
  assert.equal(result.development.activePlans, 0)
  assert.equal(result.competencies.strongestCompetency, null)
  assert.equal(result.competencies.weakestCompetency, null)
  assert.deepEqual(result.insights.nextActions, [])
})

test("createEmployeeIntelligence composes development, competencies and multiple real actions", async () => {
  const { createEmployeeIntelligence } = await loadIntelligence()
  const result = createEmployeeIntelligence(employee, {
    assessments: {
      completedAssessments: 1,
      pendingAssessments: 1,
      averageScore: 4,
      latestAssessmentAt: "2026-07-01",
    },
    developmentPlans: [],
    employeeCompetencies: [{
      id: "employee-competency-1", company_id: "company-1",
      employee_id: employee.id, competency_id: "competency-strong",
      current_level: 5, source: "manager", validated_at: null,
      notes: null, created_at: "2026-01-01", updated_at: "2026-01-01",
      archived_at: null,
    }],
    competencies: [{
      id: "competency-strong", company_id: "company-1",
      name: "Comunicação", description: null, category: "behavioral",
      expected_level: 4, weight: 1, active: true,
      created_at: "2026-01-01", updated_at: "2026-01-01",
    }],
    competencyGaps: [{
      competencyId: "competency-gap", competencyName: "Liderança",
      currentLevel: 1, expectedLevel: 4, gap: -3, weight: 1,
      required: true, status: "critical",
    }],
  }, new Date("2026-07-28T00:00:00.000Z"))

  assert.equal(result.development.activePlans, 0)
  assert.equal(result.competencies.strongestCompetency, "Comunicação")
  assert.equal(result.competencies.weakestCompetency, "Liderança")
  assert.deepEqual(
    result.insights.nextActions.map((action) => action.type),
    ["develop-competency", "create-development-plan", "start-assessment"]
  )
})

test("createEmployeeIntelligence summarizes an active plan without competency gaps", async () => {
  const { createEmployeeIntelligence } = await loadIntelligence()
  const result = createEmployeeIntelligence(employee, {
    assessments: {
      completedAssessments: 0, pendingAssessments: 0,
      averageScore: null, latestAssessmentAt: null,
    },
    developmentPlans: [{
      id: "plan-1", companyId: "company-1", employeeId: employee.id,
      ownerId: null, templateId: null, title: "Plano prioritário",
      description: null, status: "active", priority: "high",
      createdBy: "manager-1", startDate: null, dueDate: "2026-08-01",
      completedAt: null, createdAt: "2026-01-01", updatedAt: "2026-01-01",
    }],
    employeeCompetencies: [],
    competencies: [],
    competencyGaps: [],
  }, new Date("2026-07-28T00:00:00.000Z"))

  assert.equal(result.development.activePlans, 1)
  assert.equal(result.development.priorityPlan, "Plano prioritário")
  assert.equal(result.development.nextDueDate, "2026-08-01")
  assert.equal(result.competencies.weakestCompetency, null)
  assert.deepEqual(
    result.insights.nextActions.map((action) => action.type),
    ["review-development-plan"]
  )
})
