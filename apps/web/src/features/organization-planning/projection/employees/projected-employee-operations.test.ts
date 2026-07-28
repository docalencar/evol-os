import assert from "node:assert/strict"
import test from "node:test"
import type {
  ProjectedEmployee,
  ProjectedPosition,
} from "../contracts"
import {
  createProjectedEmployee,
  transferProjectedEmployee,
  updateProjectedEmployee,
} from "./projected-employee-operations"

function position(
  overrides: Partial<ProjectedPosition> = {}
): ProjectedPosition {
  return Object.freeze({
    id: "position-1",
    name: "Analista financeiro",
    description: null,
    departmentId: "department-1",
    hierarchicalLevel: "analyst",
    weeklyWorkloadHours: 40,
    workModel: "hybrid",
    employmentType: "clt",
    travelRequirement: "none",
    status: "active",
    ...overrides,
  })
}

function employee(
  overrides: Partial<ProjectedEmployee> = {}
): ProjectedEmployee {
  return Object.freeze({
    id: "employee-1",
    positionId: "position-1",
    ...overrides,
  })
}

test("createProjectedEmployee creates an immutable employee referencing an active position", () => {
  const source: readonly ProjectedEmployee[] =
    Object.freeze([])

  const result = createProjectedEmployee(
    source,
    [position()],
    "change-1",
    {
      employeeId: "employee-1",
      positionId: "position-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.deepEqual(result.employees, [
    { id: "employee-1", positionId: "position-1" },
  ])
  assert.equal(source.length, 0)
  assert.equal(Object.isFrozen(result.employees), true)
  assert.equal(Object.isFrozen(result.employees[0]), true)
})

test("createProjectedEmployee allows an unassigned employee", () => {
  const result = createProjectedEmployee(
    [],
    [],
    "change-1",
    {
      employeeId: "employee-1",
      positionId: null,
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.employees[0]?.positionId, null)
})

test("createProjectedEmployee rejects an existing id", () => {
  const result = createProjectedEmployee(
    [employee()],
    [position()],
    "change-1",
    {
      employeeId: "employee-1",
      positionId: "position-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.id_already_exists"
  )
})

test("createProjectedEmployee rejects an unknown position", () => {
  const result = createProjectedEmployee(
    [],
    [],
    "change-1",
    {
      employeeId: "employee-1",
      positionId: "position-404",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.position_not_found"
  )
})

test("createProjectedEmployee rejects an archived position", () => {
  const result = createProjectedEmployee(
    [],
    [position({ status: "archived" })],
    "change-1",
    {
      employeeId: "employee-1",
      positionId: "position-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.position_archived"
  )
})

test("updateProjectedEmployee changes the position without mutating the source", () => {
  const current = employee()
  const source = Object.freeze([current])

  const result = updateProjectedEmployee(
    source,
    [position(), position({ id: "position-2" })],
    "change-1",
    {
      employeeId: "employee-1",
      positionId: "position-2",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.deepEqual(result.employees, [
    { id: "employee-1", positionId: "position-2" },
  ])
  assert.equal(source[0], current)
  assert.equal(current.positionId, "position-1")
})

test("updateProjectedEmployee reports an empty patch", () => {
  const result = updateProjectedEmployee(
    [employee()],
    [position()],
    "change-1",
    {
      employeeId: "employee-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.update.empty_patch"
  )
})

test("updateProjectedEmployee reports an idempotent update as a warning", () => {
  const source = Object.freeze([employee()])

  const result = updateProjectedEmployee(
    source,
    [position()],
    "change-1",
    {
      employeeId: "employee-1",
      positionId: "position-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.employees, source)
  assert.equal(
    result.warning?.code,
    "employee.update.no_changes"
  )
})

test("updateProjectedEmployee rejects an unknown employee", () => {
  const result = updateProjectedEmployee(
    [],
    [position()],
    "change-1",
    {
      employeeId: "employee-404",
      positionId: "position-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.update.not_found"
  )
})

test("updateProjectedEmployee rejects an unknown target position", () => {
  const result = updateProjectedEmployee(
    [employee()],
    [position()],
    "change-1",
    {
      employeeId: "employee-1",
      positionId: "position-404",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.update.position_not_found"
  )
})

test("transferProjectedEmployee moves the employee to another position", () => {
  const result = transferProjectedEmployee(
    [employee()],
    [position(), position({ id: "position-2" })],
    "change-1",
    {
      employeeId: "employee-1",
      positionId: "position-2",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(
    result.employees[0]?.positionId,
    "position-2"
  )
})

test("transferProjectedEmployee reports an idempotent transfer as a warning", () => {
  const source = Object.freeze([employee()])

  const result = transferProjectedEmployee(
    source,
    [position()],
    "change-1",
    {
      employeeId: "employee-1",
      positionId: "position-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.employees, source)
  assert.equal(
    result.warning?.code,
    "employee.transfer.no_changes"
  )
})

test("transferProjectedEmployee rejects an unknown target position", () => {
  const result = transferProjectedEmployee(
    [employee()],
    [position()],
    "change-1",
    {
      employeeId: "employee-1",
      positionId: "position-404",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.transfer.position_not_found"
  )
})

test("employee operations are deterministic for equivalent inputs", () => {
  const first = createProjectedEmployee(
    [],
    [position()],
    "change-1",
    { employeeId: "employee-1", positionId: "position-1" }
  )
  const second = createProjectedEmployee(
    [],
    [position()],
    "change-1",
    { employeeId: "employee-1", positionId: "position-1" }
  )

  assert.deepEqual(first, second)
})
