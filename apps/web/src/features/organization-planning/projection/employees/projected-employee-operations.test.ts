import assert from "node:assert/strict"
import test from "node:test"

import type {
  ProjectedDepartment,
  ProjectedEmployee,
  ProjectedPosition,
  ProjectedTeam,
} from "../contracts"
import {
  archiveProjectedEmployee,
  createProjectedEmployee,
  moveProjectedEmployee,
  updateProjectedEmployee,
} from "./projected-employee-operations"

function department(
  overrides: Partial<ProjectedDepartment> = {}
): ProjectedDepartment {
  return Object.freeze({
    id: "department-1",
    name: "Financeiro",
    code: "FIN",
    description: null,
    parentDepartmentId: null,
    status: "active",
    ...overrides,
  } as ProjectedDepartment)
}

function team(
  overrides: Partial<ProjectedTeam> = {}
): ProjectedTeam {
  return Object.freeze({
    id: "team-1",
    name: "Contas a pagar",
    code: "CAP",
    description: null,
    departmentId: "department-1",
    status: "active",
    ...overrides,
  } as ProjectedTeam)
}

function position(
  overrides: Partial<ProjectedPosition> = {}
): ProjectedPosition {
  return Object.freeze({
    id: "position-1",
    name: "Analista financeiro",
    description: null,
    departmentId: "department-1",
    hierarchicalLevel: "analyst",
    weeklyWorkloadHours: 44,
    workModel: "on_site",
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
    fullName: "Ana Souza",
    email: "ana@empresa.com",
    status: "active",
    managerId: null,
    departmentId: "department-1",
    teamId: "team-1",
    positionId: "position-1",
    ...overrides,
  })
}

function references(
  overrides: Partial<{
    departments: readonly ProjectedDepartment[]
    teams: readonly ProjectedTeam[]
    positions: readonly ProjectedPosition[]
  }> = {}
) {
  return Object.freeze({
    departments: Object.freeze([department()]),
    teams: Object.freeze([team()]),
    positions: Object.freeze([position()]),
    ...overrides,
  })
}

test("createProjectedEmployee creates an immutable employee with normalized fields", () => {
  const employees: readonly ProjectedEmployee[] =
    Object.freeze([])

  const result = createProjectedEmployee(
    employees,
    references(),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: " Ana Souza ",
      email: " ANA@EMPRESA.COM ",
      status: "active",
      managerId: null,
      departmentId: "department-1",
      teamId: "team-1",
      positionId: "position-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.deepEqual(result.employees, [
    {
      id: "employee-1",
      fullName: "Ana Souza",
      email: "ana@empresa.com",
      status: "active",
      managerId: null,
      departmentId: "department-1",
      teamId: "team-1",
      positionId: "position-1",
    },
  ])

  assert.deepEqual(result.event, {
    type: "employee.created",
    changeSetId: "change-1",
    employeeId: "employee-1",
  })

  assert.equal(employees.length, 0)
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.employees), true)
  assert.equal(
    Object.isFrozen(result.employees[0]),
    true
  )
})

test("createProjectedEmployee normalizes an empty email to null", () => {
  const result = createProjectedEmployee(
    [],
    references(),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: "   ",
      status: "active",
      managerId: null,
      departmentId: "department-1",
      teamId: "team-1",
      positionId: "position-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.employees[0]?.email, null)
})

test("createProjectedEmployee rejects an existing id", () => {
  const result = createProjectedEmployee(
    [employee()],
    references(),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Bruno Lima",
      email: "bruno@empresa.com",
      status: "active",
      managerId: null,
      departmentId: null,
      teamId: null,
      positionId: null,
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

test("createProjectedEmployee rejects duplicate emails ignoring case and spaces", () => {
  const result = createProjectedEmployee(
    [employee()],
    references(),
    "change-1",
    {
      employeeId: "employee-2",
      fullName: "Bruno Lima",
      email: " ANA@EMPRESA.COM ",
      status: "active",
      managerId: null,
      departmentId: null,
      teamId: null,
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.email_already_exists"
  )
})

test("createProjectedEmployee allows multiple null emails", () => {
  const result = createProjectedEmployee(
    [
      employee({
        email: null,
      }),
    ],
    references(),
    "change-1",
    {
      employeeId: "employee-2",
      fullName: "Bruno Lima",
      email: null,
      status: "active",
      managerId: null,
      departmentId: null,
      teamId: null,
      positionId: null,
    }
  )

  assert.equal(result.success, true)
})

test("createProjectedEmployee accepts an active manager", () => {
  const manager = employee({
    id: "manager-1",
    fullName: "Maria Gestora",
    email: "maria@empresa.com",
  })

  const result = createProjectedEmployee(
    [manager],
    references(),
    "change-1",
    {
      employeeId: "employee-2",
      fullName: "Bruno Lima",
      email: "bruno@empresa.com",
      status: "active",
      managerId: "manager-1",
      departmentId: "department-1",
      teamId: "team-1",
      positionId: "position-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(
    result.employees[1]?.managerId,
    "manager-1"
  )
})

test("createProjectedEmployee rejects self management", () => {
  const result = createProjectedEmployee(
    [],
    references(),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: "ana@empresa.com",
      status: "active",
      managerId: "employee-1",
      departmentId: null,
      teamId: null,
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.self_manager"
  )
})

test("createProjectedEmployee rejects an unknown manager", () => {
  const result = createProjectedEmployee(
    [],
    references(),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: "ana@empresa.com",
      status: "active",
      managerId: "manager-missing",
      departmentId: null,
      teamId: null,
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.manager_not_found"
  )
})

test("createProjectedEmployee rejects a terminated manager", () => {
  const result = createProjectedEmployee(
    [
      employee({
        id: "manager-1",
        status: "terminated",
      }),
    ],
    references(),
    "change-1",
    {
      employeeId: "employee-2",
      fullName: "Bruno Lima",
      email: "bruno@empresa.com",
      status: "active",
      managerId: "manager-1",
      departmentId: null,
      teamId: null,
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.manager_terminated"
  )
})

test("createProjectedEmployee rejects an unknown department", () => {
  const result = createProjectedEmployee(
    [],
    references({
      departments: [],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: null,
      status: "active",
      managerId: null,
      departmentId: "department-missing",
      teamId: null,
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.department_not_found"
  )
})

test("createProjectedEmployee rejects an archived department", () => {
  const result = createProjectedEmployee(
    [],
    references({
      departments: [
        department({
          status: "archived",
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: null,
      status: "active",
      managerId: null,
      departmentId: "department-1",
      teamId: null,
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.department_archived"
  )
})

test("createProjectedEmployee rejects an unknown team", () => {
  const result = createProjectedEmployee(
    [],
    references({
      teams: [],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: null,
      status: "active",
      managerId: null,
      departmentId: "department-1",
      teamId: "team-missing",
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.team_not_found"
  )
})

test("createProjectedEmployee rejects an archived team", () => {
  const result = createProjectedEmployee(
    [],
    references({
      teams: [
        team({
          status: "archived",
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: null,
      status: "active",
      managerId: null,
      departmentId: "department-1",
      teamId: "team-1",
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.team_archived"
  )
})

test("createProjectedEmployee requires a department when a team is informed", () => {
  const result = createProjectedEmployee(
    [],
    references(),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: null,
      status: "active",
      managerId: null,
      departmentId: null,
      teamId: "team-1",
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.department_required_for_team"
  )
})

test("createProjectedEmployee rejects a team from another department", () => {
  const result = createProjectedEmployee(
    [],
    references({
      departments: [
        department(),
        department({
          id: "department-2",
          name: "Comercial",
          code: "COM",
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: null,
      status: "active",
      managerId: null,
      departmentId: "department-2",
      teamId: "team-1",
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.team_department_mismatch"
  )
})

test("createProjectedEmployee rejects an unknown position", () => {
  const result = createProjectedEmployee(
    [],
    references({
      positions: [],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: null,
      status: "active",
      managerId: null,
      departmentId: "department-1",
      teamId: null,
      positionId: "position-missing",
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
    references({
      positions: [
        position({
          status: "archived",
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: null,
      status: "active",
      managerId: null,
      departmentId: "department-1",
      teamId: null,
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

test("createProjectedEmployee requires a department for a department-bound position", () => {
  const result = createProjectedEmployee(
    [],
    references(),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: null,
      status: "active",
      managerId: null,
      departmentId: null,
      teamId: null,
      positionId: "position-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.department_required_for_position"
  )
})

test("createProjectedEmployee rejects a position from another department", () => {
  const result = createProjectedEmployee(
    [],
    references({
      departments: [
        department(),
        department({
          id: "department-2",
          name: "Comercial",
          code: "COM",
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: null,
      status: "active",
      managerId: null,
      departmentId: "department-2",
      teamId: null,
      positionId: "position-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.create.position_department_mismatch"
  )
})

test("createProjectedEmployee accepts a global position without a department", () => {
  const result = createProjectedEmployee(
    [],
    references({
      positions: [
        position({
          departmentId: null,
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: null,
      status: "active",
      managerId: null,
      departmentId: null,
      teamId: null,
      positionId: "position-1",
    }
  )

  assert.equal(result.success, true)
})

test("updateProjectedEmployee applies a partial immutable update", () => {
  const current = employee()
  const source = Object.freeze([current])

  const result = updateProjectedEmployee(
    source,
    "change-1",
    {
      employeeId: "employee-1",
      fullName: " Ana Maria Souza ",
      email: " ANA.MARIA@EMPRESA.COM ",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.deepEqual(result.employees, [
    {
      id: "employee-1",
      fullName: "Ana Maria Souza",
      email: "ana.maria@empresa.com",
      status: "active",
      managerId: null,
      departmentId: "department-1",
      teamId: "team-1",
      positionId: "position-1",
    },
  ])

  assert.deepEqual(result.event, {
    type: "employee.updated",
    changeSetId: "change-1",
    employeeId: "employee-1",
    changedFields: ["fullName", "email"],
  })

  assert.equal(source[0], current)
  assert.equal(current.fullName, "Ana Souza")
  assert.equal(Object.isFrozen(result.employees), true)
  assert.equal(
    Object.isFrozen(result.employees[0]),
    true
  )
})

test("updateProjectedEmployee rejects an unknown employee", () => {
  const result = updateProjectedEmployee(
    [],
    "change-1",
    {
      employeeId: "employee-missing",
      fullName: "Ana Souza",
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

test("updateProjectedEmployee rejects a terminated employee", () => {
  const result = updateProjectedEmployee(
    [
      employee({
        status: "terminated",
      }),
    ],
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Maria Souza",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.update.terminated"
  )
})

test("updateProjectedEmployee rejects an empty patch", () => {
  const result = updateProjectedEmployee(
    [employee()],
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
    "change-1",
    {
      employeeId: "employee-1",
      fullName: "Ana Souza",
      email: "ANA@EMPRESA.COM",
      status: "active",
      managerId: null,
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.employees, source)
  assert.equal(result.event, undefined)
  assert.equal(
    result.warning?.code,
    "employee.update.no_changes"
  )
})

test("updateProjectedEmployee rejects a duplicate email", () => {
  const result = updateProjectedEmployee(
    [
      employee(),
      employee({
        id: "employee-2",
        fullName: "Bruno Lima",
        email: "bruno@empresa.com",
      }),
    ],
    "change-1",
    {
      employeeId: "employee-2",
      email: " ANA@EMPRESA.COM ",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.update.email_already_exists"
  )
})

test("updateProjectedEmployee allows removing an email", () => {
  const result = updateProjectedEmployee(
    [employee()],
    "change-1",
    {
      employeeId: "employee-1",
      email: null,
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.employees[0]?.email, null)
  assert.deepEqual(result.event, {
    type: "employee.updated",
    changeSetId: "change-1",
    employeeId: "employee-1",
    changedFields: ["email"],
  })
})

test("updateProjectedEmployee rejects self management", () => {
  const result = updateProjectedEmployee(
    [employee()],
    "change-1",
    {
      employeeId: "employee-1",
      managerId: "employee-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.update.self_manager"
  )
})

test("updateProjectedEmployee rejects an unknown manager", () => {
  const result = updateProjectedEmployee(
    [employee()],
    "change-1",
    {
      employeeId: "employee-1",
      managerId: "manager-missing",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.update.manager_not_found"
  )
})

test("updateProjectedEmployee rejects a terminated manager", () => {
  const result = updateProjectedEmployee(
    [
      employee(),
      employee({
        id: "manager-1",
        fullName: "Maria Gestora",
        email: "maria@empresa.com",
        status: "terminated",
      }),
    ],
    "change-1",
    {
      employeeId: "employee-1",
      managerId: "manager-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.update.manager_terminated"
  )
})

test("updateProjectedEmployee rejects a direct management cycle", () => {
  const result = updateProjectedEmployee(
    [
      employee({
        id: "employee-1",
        managerId: null,
      }),
      employee({
        id: "employee-2",
        fullName: "Bruno Lima",
        email: "bruno@empresa.com",
        managerId: "employee-1",
      }),
    ],
    "change-1",
    {
      employeeId: "employee-1",
      managerId: "employee-2",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.update.management_cycle"
  )
})

test("updateProjectedEmployee rejects an indirect management cycle", () => {
  const result = updateProjectedEmployee(
    [
      employee({
        id: "employee-1",
        managerId: null,
      }),
      employee({
        id: "employee-2",
        fullName: "Bruno Lima",
        email: "bruno@empresa.com",
        managerId: "employee-1",
      }),
      employee({
        id: "employee-3",
        fullName: "Carla Mendes",
        email: "carla@empresa.com",
        managerId: "employee-2",
      }),
    ],
    "change-1",
    {
      employeeId: "employee-1",
      managerId: "employee-3",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.update.management_cycle"
  )
})

test("updateProjectedEmployee allows removing the manager", () => {
  const result = updateProjectedEmployee(
    [
      employee({
        managerId: "manager-1",
      }),
      employee({
        id: "manager-1",
        fullName: "Maria Gestora",
        email: "maria@empresa.com",
      }),
    ],
    "change-1",
    {
      employeeId: "employee-1",
      managerId: null,
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(
    result.employees[0]?.managerId,
    null
  )
})

test("archiveProjectedEmployee terminates and clears structural allocation", () => {
  const current = employee()
  const source = Object.freeze([current])

  const result = archiveProjectedEmployee(
    source,
    "change-1",
    {
      employeeId: "employee-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.deepEqual(result.employees, [
    {
      id: "employee-1",
      fullName: "Ana Souza",
      email: "ana@empresa.com",
      status: "terminated",
      managerId: null,
      departmentId: null,
      teamId: null,
      positionId: null,
    },
  ])

  assert.deepEqual(result.event, {
    type: "employee.archived",
    changeSetId: "change-1",
    employeeId: "employee-1",
  })

  assert.equal(source[0], current)
  assert.equal(source[0]?.status, "active")
  assert.equal(
    source[0]?.departmentId,
    "department-1"
  )
})

test("archiveProjectedEmployee rejects an unknown employee", () => {
  const result = archiveProjectedEmployee(
    [],
    "change-1",
    {
      employeeId: "employee-missing",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.archive.not_found"
  )
})

test("archiveProjectedEmployee reports an already terminated employee as a warning", () => {
  const source = Object.freeze([
    employee({
      status: "terminated",
      departmentId: null,
      teamId: null,
      positionId: null,
    }),
  ])

  const result = archiveProjectedEmployee(
    source,
    "change-1",
    {
      employeeId: "employee-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.employees, source)
  assert.equal(result.event, undefined)
  assert.equal(
    result.warning?.code,
    "employee.archive.already_archived"
  )
})

test("archiveProjectedEmployee rejects an employee with active direct reports", () => {
  const result = archiveProjectedEmployee(
    [
      employee({
        id: "manager-1",
        fullName: "Maria Gestora",
        email: "maria@empresa.com",
      }),
      employee({
        id: "employee-1",
        managerId: "manager-1",
      }),
    ],
    "change-1",
    {
      employeeId: "manager-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.archive.has_active_direct_reports"
  )
})

test("archiveProjectedEmployee ignores terminated direct reports", () => {
  const result = archiveProjectedEmployee(
    [
      employee({
        id: "manager-1",
        fullName: "Maria Gestora",
        email: "maria@empresa.com",
      }),
      employee({
        id: "employee-1",
        managerId: "manager-1",
        status: "terminated",
      }),
    ],
    "change-1",
    {
      employeeId: "manager-1",
    }
  )

  assert.equal(result.success, true)
})

test("moveProjectedEmployee moves an employee without mutating the source", () => {
  const current = employee()
  const source = Object.freeze([current])

  const result = moveProjectedEmployee(
    source,
    references({
      departments: [
        department(),
        department({
          id: "department-2",
          name: "Comercial",
          code: "COM",
        }),
      ],
      teams: [
        team(),
        team({
          id: "team-2",
          name: "Vendas",
          code: "VEN",
          departmentId: "department-2",
        }),
      ],
      positions: [
        position(),
        position({
          id: "position-2",
          name: "Executivo comercial",
          departmentId: "department-2",
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: "department-2",
      teamId: "team-2",
      positionId: "position-2",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.deepEqual(result.employees, [
    {
      id: "employee-1",
      fullName: "Ana Souza",
      email: "ana@empresa.com",
      status: "active",
      managerId: null,
      departmentId: "department-2",
      teamId: "team-2",
      positionId: "position-2",
    },
  ])

  assert.deepEqual(result.event, {
    type: "employee.moved",
    changeSetId: "change-1",
    employeeId: "employee-1",
    previousDepartmentId: "department-1",
    departmentId: "department-2",
    previousTeamId: "team-1",
    teamId: "team-2",
    previousPositionId: "position-1",
    positionId: "position-2",
  })

  assert.equal(source[0], current)
  assert.equal(
    source[0]?.departmentId,
    "department-1"
  )
})

test("moveProjectedEmployee rejects an unknown employee", () => {
  const result = moveProjectedEmployee(
    [],
    references(),
    "change-1",
    {
      employeeId: "employee-missing",
      departmentId: null,
      teamId: null,
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.not_found"
  )
})

test("moveProjectedEmployee rejects a terminated employee", () => {
  const result = moveProjectedEmployee(
    [
      employee({
        status: "terminated",
      }),
    ],
    references(),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: null,
      teamId: null,
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.terminated"
  )
})

test("moveProjectedEmployee reports an idempotent move as a warning", () => {
  const source = Object.freeze([employee()])

  const result = moveProjectedEmployee(
    source,
    references(),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: "department-1",
      teamId: "team-1",
      positionId: "position-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.employees, source)
  assert.equal(result.event, undefined)
  assert.equal(
    result.warning?.code,
    "employee.move.no_changes"
  )
})

test("moveProjectedEmployee rejects an unknown department", () => {
  const result = moveProjectedEmployee(
    [employee()],
    references({
      departments: [],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: "department-missing",
      teamId: null,
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.department_not_found"
  )
})

test("moveProjectedEmployee rejects an archived department", () => {
  const result = moveProjectedEmployee(
    [employee()],
    references({
      departments: [
        department({
          status: "archived",
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: "department-1",
      teamId: null,
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.department_archived"
  )
})

test("moveProjectedEmployee rejects an unknown team", () => {
  const result = moveProjectedEmployee(
    [employee()],
    references({
      teams: [],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: "department-1",
      teamId: "team-missing",
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.team_not_found"
  )
})

test("moveProjectedEmployee rejects an archived team", () => {
  const result = moveProjectedEmployee(
    [employee()],
    references({
      teams: [
        team({
          status: "archived",
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: "department-1",
      teamId: "team-1",
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.team_archived"
  )
})

test("moveProjectedEmployee requires a department when a team is informed", () => {
  const result = moveProjectedEmployee(
    [employee()],
    references(),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: null,
      teamId: "team-1",
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.department_required_for_team"
  )
})

test("moveProjectedEmployee rejects a team from another department", () => {
  const result = moveProjectedEmployee(
    [employee()],
    references({
      departments: [
        department(),
        department({
          id: "department-2",
          name: "Comercial",
          code: "COM",
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: "department-2",
      teamId: "team-1",
      positionId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.team_department_mismatch"
  )
})

test("moveProjectedEmployee rejects an unknown position", () => {
  const result = moveProjectedEmployee(
    [employee()],
    references({
      positions: [],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: "department-1",
      teamId: null,
      positionId: "position-missing",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.position_not_found"
  )
})

test("moveProjectedEmployee rejects an archived position", () => {
  const result = moveProjectedEmployee(
    [employee()],
    references({
      positions: [
        position({
          status: "archived",
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: "department-1",
      teamId: null,
      positionId: "position-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.position_archived"
  )
})

test("moveProjectedEmployee requires a department for a department-bound position", () => {
  const result = moveProjectedEmployee(
    [employee()],
    references(),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: null,
      teamId: null,
      positionId: "position-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.department_required_for_position"
  )
})

test("moveProjectedEmployee rejects a position from another department", () => {
  const result = moveProjectedEmployee(
    [employee()],
    references({
      departments: [
        department(),
        department({
          id: "department-2",
          name: "Comercial",
          code: "COM",
        }),
      ],
    }),
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: "department-2",
      teamId: null,
      positionId: "position-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "employee.move.position_department_mismatch"
  )
})

test("employee operations are deterministic for equivalent inputs", () => {
  const employees = Object.freeze([employee()])
  const structuralReferences = references()

  const first = moveProjectedEmployee(
    employees,
    structuralReferences,
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: null,
      teamId: null,
      positionId: null,
    }
  )

  const second = moveProjectedEmployee(
    employees,
    structuralReferences,
    "change-1",
    {
      employeeId: "employee-1",
      departmentId: null,
      teamId: null,
      positionId: null,
    }
  )

  assert.deepEqual(first, second)
})
