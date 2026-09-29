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

const employee = (id: string, name: string): Employee => ({
  id,
  company_id: "company-1",
  full_name: name,
  email: null,
  phone: null,
  birth_date: null,
  hire_date: null,
  status: "active",
  manager_id: null,
  team_id: null,
  position_id: null,
  disc_profile: null,
  avatar_url: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
})

test("batch facts make employee intelligence vary by employee", async () => {
  const { composeEmployeeIntelligenceList } = await import(
    "./compose-employee-intelligence-list"
  )

  const result = composeEmployeeIntelligenceList({
    employees: [employee("employee-1", "Ana"), employee("employee-2", "Bia")],
    competencies: [{
      id: "competency-1",
      company_id: "company-1",
      name: "Liderança",
      description: null,
      category: "leadership",
      expected_level: 4,
      weight: 1,
      active: true,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    }],
    developmentPlans: [{
      employeeId: "employee-1",
      title: "PDI de Ana",
      status: "active",
      priority: "high",
      dueDate: "2026-10-15",
    }],
    assessmentSummaries: [{
      employeeId: "employee-1",
      completedAssessments: 2,
      pendingAssessments: 1,
      latestCompletedAt: "2026-09-20T10:00:00.000Z",
    }],
    competencyCoverages: [{
      assignmentState: "active_assignment_with_expectations",
      personId: "employee-1",
      positionId: "position-1",
      positionSeniorityProfileId: "profile-1",
      seniorityLevelId: "seniority-1",
      competencies: [{
        competencyId: "competency-1",
        competencyName: "Liderança",
        expectedLevel: 4,
        currentLevel: 2,
        gap: 2,
        evidenceState: "assessed",
        weight: 1,
        required: true,
        competencyType: "leadership",
        inherited: false,
        expectationSource: "position",
        expectationNotes: null,
        employeeCompetencyId: "employee-competency-1",
        evidenceSource: "manager",
        validatedAt: null,
      }],
    }],
  }, new Date("2026-09-28T00:00:00.000Z"))

  assert.equal(result[0]?.assessments.completedAssessments, 2)
  assert.equal(result[0]?.development.activePlans, 1)
  assert.equal(result[0]?.competencies.strongestCompetency, "Liderança")
  assert.equal(result[0]?.competencies.weakestCompetency, "Liderança")

  assert.equal(result[1]?.assessments.completedAssessments, 0)
  assert.equal(result[1]?.development.activePlans, 0)
  assert.equal(result[1]?.competencies.strongestCompetency, null)
  assert.equal(result[1]?.competencies.weakestCompetency, null)
  assert.notDeepEqual(result[0], result[1])
})
