import assert from "node:assert/strict"
import test from "node:test"

import { createBaselineOrganization } from "./create-baseline-organization"

test("creates a complete immutable Baseline organization", () => {
  const source = {
    departments: [{
      id: "department-1",
      name: "Operações",
      code: "OPS",
      description: null,
      parentDepartmentId: null,
    }],
    teams: [{
      id: "team-1",
      name: "Plataforma",
      code: null,
      description: null,
      departmentId: "department-1",
    }],
    positions: [
      {
        id: "position-1",
        name: "Analista",
        description: null,
        departmentId: "department-1",
        hierarchicalLevel: "analyst" as const,
        weeklyWorkloadHours: 40,
        workModel: "hybrid" as const,
        employmentType: "clt" as const,
        travelRequirement: "none" as const,
        active: true,
      },
      {
        id: "position-2",
        name: "Cargo inativo",
        description: null,
        departmentId: null,
        hierarchicalLevel: "analyst" as const,
        weeklyWorkloadHours: 40,
        workModel: "remote" as const,
        employmentType: "clt" as const,
        travelRequirement: "none" as const,
        active: false,
      },
    ],
    employees: [{ id: "employee-1", positionId: "position-1" }],
  }

  const result = createBaselineOrganization(source)

  assert.equal(result.departments[0]?.status, "active")
  assert.equal(result.teams[0]?.status, "active")
  assert.deepEqual(
    result.positions.map(({ status }) => status),
    ["active", "archived"]
  )
  assert.deepEqual(result.vacancies, [])
  assert.deepEqual(result.metrics, {
    headcount: 1,
    vacancies: 0,
    salaryMass: 0,
    departments: 1,
    positions: 2,
  })
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.departments), true)
})
