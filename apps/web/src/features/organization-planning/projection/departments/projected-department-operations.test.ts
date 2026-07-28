import assert from "node:assert/strict"
import test from "node:test"
import type {
  ProjectedDepartment,
  ProjectedPosition,
  ProjectedTeam,
} from "../contracts"
import {
  archiveProjectedDepartment,
  createProjectedDepartment,
  updateProjectedDepartment,
} from "./projected-department-operations"

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
  })
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
  })
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
    weeklyWorkloadHours: 40,
    workModel: "hybrid",
    employmentType: "clt",
    travelRequirement: "none",
    status: "active",
    ...overrides,
  })
}

test("createProjectedDepartment creates an active immutable department", () => {
  const source: readonly ProjectedDepartment[] =
    Object.freeze([])

  const result = createProjectedDepartment(
    source,
    "change-1",
    {
      departmentId: "department-1",
      name: " Financeiro ",
      code: " FIN ",
      description: " Área financeira ",
      parentDepartmentId: null,
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.deepEqual(result.departments, [
    {
      id: "department-1",
      name: "Financeiro",
      code: "FIN",
      description: "Área financeira",
      parentDepartmentId: null,
      status: "active",
    },
  ])

  assert.deepEqual(result.event, {
    type: "department.created",
    changeSetId: "change-1",
    departmentId: "department-1",
  })

  assert.equal(source.length, 0)
  assert.equal(
    Object.isFrozen(result.departments),
    true
  )
  assert.equal(
    Object.isFrozen(result.departments[0]),
    true
  )
})

test("createProjectedDepartment rejects an existing id", () => {
  const result = createProjectedDepartment(
    [department()],
    "change-1",
    {
      departmentId: "department-1",
      name: "Controladoria",
      code: "CTL",
      description: null,
      parentDepartmentId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.create.id_already_exists"
  )
})

test("createProjectedDepartment rejects duplicate active names ignoring case and spaces", () => {
  const result = createProjectedDepartment(
    [department()],
    "change-1",
    {
      departmentId: "department-2",
      name: " financeiro ",
      code: null,
      description: null,
      parentDepartmentId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.create.name_already_exists"
  )
})

test("createProjectedDepartment allows the name of an archived department", () => {
  const result = createProjectedDepartment(
    [
      department({
        status: "archived",
      }),
    ],
    "change-1",
    {
      departmentId: "department-2",
      name: "Financeiro",
      code: null,
      description: null,
      parentDepartmentId: null,
    }
  )

  assert.equal(result.success, true)
})

test("createProjectedDepartment rejects duplicate active codes", () => {
  const result = createProjectedDepartment(
    [department()],
    "change-1",
    {
      departmentId: "department-2",
      name: "Controladoria",
      code: " fin ",
      description: null,
      parentDepartmentId: null,
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.create.code_already_exists"
  )
})

test("createProjectedDepartment rejects an unknown parent", () => {
  const result = createProjectedDepartment(
    [],
    "change-1",
    {
      departmentId: "department-1",
      name: "Financeiro",
      code: null,
      description: null,
      parentDepartmentId: "department-parent",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.create.parent_not_found"
  )
})

test("createProjectedDepartment rejects an archived parent", () => {
  const result = createProjectedDepartment(
    [
      department({
        id: "department-parent",
        status: "archived",
      }),
    ],
    "change-1",
    {
      departmentId: "department-child",
      name: "Contas a pagar",
      code: null,
      description: null,
      parentDepartmentId: "department-parent",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.create.parent_archived"
  )
})

test("createProjectedDepartment rejects self-parenting", () => {
  const result = createProjectedDepartment(
    [],
    "change-1",
    {
      departmentId: "department-1",
      name: "Financeiro",
      code: null,
      description: null,
      parentDepartmentId: "department-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.create.self_parent"
  )
})

test("updateProjectedDepartment applies a partial update without changing the source", () => {
  const current = department()
  const source = Object.freeze([current])

  const result = updateProjectedDepartment(
    source,
    "change-1",
    {
      departmentId: "department-1",
      name: "Finanças",
      description: "Gestão financeira",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.deepEqual(result.departments, [
    {
      id: "department-1",
      name: "Finanças",
      code: "FIN",
      description: "Gestão financeira",
      parentDepartmentId: null,
      status: "active",
    },
  ])

  assert.deepEqual(result.event, {
    type: "department.updated",
    changeSetId: "change-1",
    departmentId: "department-1",
    changedFields: [
      "name",
      "description",
    ],
  })

  assert.equal(source[0], current)
  assert.equal(current.name, "Financeiro")
})

test("updateProjectedDepartment reports an empty patch", () => {
  const result = updateProjectedDepartment(
    [department()],
    "change-1",
    {
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.update.empty_patch"
  )
})

test("updateProjectedDepartment reports an idempotent update as a warning", () => {
  const source = Object.freeze([department()])

  const result = updateProjectedDepartment(
    source,
    "change-1",
    {
      departmentId: "department-1",
      name: "Financeiro",
      code: "FIN",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.departments, source)
  assert.equal(result.event, undefined)
  assert.equal(
    result.warning?.code,
    "department.update.no_changes"
  )
})

test("updateProjectedDepartment rejects an archived department", () => {
  const result = updateProjectedDepartment(
    [
      department({
        status: "archived",
      }),
    ],
    "change-1",
    {
      departmentId: "department-1",
      name: "Finanças",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.update.archived"
  )
})

test("updateProjectedDepartment rejects a duplicate name", () => {
  const result = updateProjectedDepartment(
    [
      department(),
      department({
        id: "department-2",
        name: "Controladoria",
        code: "CTL",
      }),
    ],
    "change-1",
    {
      departmentId: "department-2",
      name: " financeiro ",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.update.name_already_exists"
  )
})

test("updateProjectedDepartment rejects a duplicate code", () => {
  const result = updateProjectedDepartment(
    [
      department(),
      department({
        id: "department-2",
        name: "Controladoria",
        code: "CTL",
      }),
    ],
    "change-1",
    {
      departmentId: "department-2",
      code: " fin ",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.update.code_already_exists"
  )
})

test("updateProjectedDepartment rejects a direct hierarchy cycle", () => {
  const result = updateProjectedDepartment(
    [department()],
    "change-1",
    {
      departmentId: "department-1",
      parentDepartmentId: "department-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.update.self_parent"
  )
})

test("updateProjectedDepartment rejects an indirect hierarchy cycle", () => {
  const departments: readonly ProjectedDepartment[] =
    Object.freeze([
      department({
        id: "department-a",
        name: "Departamento A",
        code: "A",
      }),
      department({
        id: "department-b",
        name: "Departamento B",
        code: "B",
        parentDepartmentId: "department-a",
      }),
      department({
        id: "department-c",
        name: "Departamento C",
        code: "C",
        parentDepartmentId: "department-b",
      }),
    ])

  const result = updateProjectedDepartment(
    departments,
    "change-1",
    {
      departmentId: "department-a",
      parentDepartmentId: "department-c",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.update.hierarchy_cycle"
  )
})

test("archiveProjectedDepartment archives an active department", () => {
  const source = Object.freeze([department()])

  const result = archiveProjectedDepartment(
    source,
    [],
    [],
    "change-1",
    {
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(
    result.departments[0]?.status,
    "archived"
  )

  assert.deepEqual(result.event, {
    type: "department.archived",
    changeSetId: "change-1",
    departmentId: "department-1",
  })

  assert.equal(source[0]?.status, "active")
})

test("archiveProjectedDepartment reports an already archived department as a warning", () => {
  const source = Object.freeze([
    department({
      status: "archived",
    }),
  ])

  const result = archiveProjectedDepartment(
    source,
    [],
    [],
    "change-1",
    {
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.departments, source)
  assert.equal(result.event, undefined)
  assert.equal(
    result.warning?.code,
    "department.archive.already_archived"
  )
})

test("archiveProjectedDepartment rejects a department with active children", () => {
  const result = archiveProjectedDepartment(
    [
      department({
        id: "department-parent",
        name: "Operações",
        code: "OPE",
      }),
      department({
        id: "department-child",
        name: "Logística",
        code: "LOG",
        parentDepartmentId: "department-parent",
      }),
    ],
    [],
    [],
    "change-1",
    {
      departmentId: "department-parent",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.archive.has_active_children"
  )
})

test("archiveProjectedDepartment allows archive when all children are archived", () => {
  const result = archiveProjectedDepartment(
    [
      department({
        id: "department-parent",
        name: "Operações",
        code: "OPE",
      }),
      department({
        id: "department-child",
        name: "Logística",
        code: "LOG",
        parentDepartmentId: "department-parent",
        status: "archived",
      }),
    ],
    [],
    [],
    "change-1",
    {
      departmentId: "department-parent",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(
    result.departments[0]?.status,
    "archived"
  )
})

test("archiveProjectedDepartment rejects a department with active teams", () => {
  const departments = Object.freeze([department()])
  const teams = Object.freeze([
    team({ id: "team-1", departmentId: "department-1" }),
  ])

  const result = archiveProjectedDepartment(
    departments,
    teams,
    [],
    "change-1",
    {
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.archive.has_active_teams"
  )
  assert.equal(departments[0]?.status, "active")
  assert.equal(teams[0]?.status, "active")
})

test("archiveProjectedDepartment rejects a department with active positions", () => {
  const departments = Object.freeze([department()])
  const positions = Object.freeze([
    position({ id: "position-1", departmentId: "department-1" }),
  ])

  const result = archiveProjectedDepartment(
    departments,
    [],
    positions,
    "change-1",
    {
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "department.archive.has_active_positions"
  )
  assert.equal(departments[0]?.status, "active")
  assert.equal(positions[0]?.status, "active")
})

test("archiveProjectedDepartment allows archive when children, teams and positions are archived", () => {
  const result = archiveProjectedDepartment(
    [
      department(),
      department({
        id: "department-child",
        parentDepartmentId: "department-1",
        status: "archived",
      }),
    ],
    [team({ status: "archived", departmentId: "department-1" })],
    [position({ status: "archived", departmentId: "department-1" })],
    "change-1",
    {
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(
    result.departments[0]?.status,
    "archived"
  )
})

test("department operations are deterministic for equivalent inputs", () => {
  const input = Object.freeze([department()])

  const first = updateProjectedDepartment(
    input,
    "change-1",
    {
      departmentId: "department-1",
      name: "Finanças",
    }
  )

  const second = updateProjectedDepartment(
    input,
    "change-1",
    {
      departmentId: "department-1",
      name: "Finanças",
    }
  )

  assert.deepEqual(first, second)
})
