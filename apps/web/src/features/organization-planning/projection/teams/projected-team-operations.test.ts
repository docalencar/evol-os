import assert from "node:assert/strict"
import test from "node:test"

import type {
  ProjectedDepartment,
  ProjectedTeam,
} from "../contracts"
import {
  archiveProjectedTeam,
  createProjectedTeam,
  updateProjectedTeam,
} from "./projected-team-operations"

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

test("createProjectedTeam creates an active immutable team", () => {
  const teams: readonly ProjectedTeam[] = Object.freeze([])
  const departments = Object.freeze([department()])

  const result = createProjectedTeam(
    teams,
    departments,
    "change-1",
    {
      teamId: "team-1",
      name: " Contas a pagar ",
      code: " CAP ",
      description: " Pagamentos e fornecedores ",
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.deepEqual(result.teams, [
    {
      id: "team-1",
      name: "Contas a pagar",
      code: "CAP",
      description: "Pagamentos e fornecedores",
      departmentId: "department-1",
      status: "active",
    },
  ])

  assert.deepEqual(result.event, {
    type: "team.created",
    changeSetId: "change-1",
    teamId: "team-1",
  })

  assert.equal(teams.length, 0)
  assert.equal(Object.isFrozen(result.teams), true)
  assert.equal(Object.isFrozen(result.teams[0]), true)
})

test("createProjectedTeam rejects an existing id", () => {
  const result = createProjectedTeam(
    [team()],
    [department()],
    "change-1",
    {
      teamId: "team-1",
      name: "Tesouraria",
      code: "TES",
      description: null,
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "team.create.id_already_exists"
  )
})

test("createProjectedTeam rejects duplicate active names ignoring case and spaces", () => {
  const result = createProjectedTeam(
    [team()],
    [department()],
    "change-1",
    {
      teamId: "team-2",
      name: " contas a pagar ",
      code: null,
      description: null,
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "team.create.name_already_exists"
  )
})

test("createProjectedTeam allows the name of an archived team", () => {
  const result = createProjectedTeam(
    [
      team({
        status: "archived",
      }),
    ],
    [department()],
    "change-1",
    {
      teamId: "team-2",
      name: "Contas a pagar",
      code: null,
      description: null,
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, true)
})

test("createProjectedTeam rejects duplicate active codes", () => {
  const result = createProjectedTeam(
    [team()],
    [department()],
    "change-1",
    {
      teamId: "team-2",
      name: "Tesouraria",
      code: " cap ",
      description: null,
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "team.create.code_already_exists"
  )
})

test("createProjectedTeam rejects an unknown department", () => {
  const result = createProjectedTeam(
    [],
    [],
    "change-1",
    {
      teamId: "team-1",
      name: "Contas a pagar",
      code: "CAP",
      description: null,
      departmentId: "department-missing",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "team.create.department_not_found"
  )
})

test("createProjectedTeam rejects an archived department", () => {
  const result = createProjectedTeam(
    [],
    [
      department({
        status: "archived",
      }),
    ],
    "change-1",
    {
      teamId: "team-1",
      name: "Contas a pagar",
      code: "CAP",
      description: null,
      departmentId: "department-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "team.create.department_archived"
  )
})

test("updateProjectedTeam applies a partial update without changing the source", () => {
  const current = team()
  const source = Object.freeze([current])

  const result = updateProjectedTeam(
    source,
    [department()],
    "change-1",
    {
      teamId: "team-1",
      name: "Tesouraria",
      description: "Gestão de caixa",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.deepEqual(result.teams, [
    {
      id: "team-1",
      name: "Tesouraria",
      code: "CAP",
      description: "Gestão de caixa",
      departmentId: "department-1",
      status: "active",
    },
  ])

  assert.deepEqual(result.event, {
    type: "team.updated",
    changeSetId: "change-1",
    teamId: "team-1",
    changedFields: [
      "name",
      "description",
    ],
  })

  assert.equal(source[0], current)
  assert.equal(current.name, "Contas a pagar")
})

test("updateProjectedTeam reports an empty patch", () => {
  const result = updateProjectedTeam(
    [team()],
    [department()],
    "change-1",
    {
      teamId: "team-1",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "team.update.empty_patch"
  )
})

test("updateProjectedTeam reports an idempotent update as a warning", () => {
  const source = Object.freeze([team()])

  const result = updateProjectedTeam(
    source,
    [department()],
    "change-1",
    {
      teamId: "team-1",
      name: "Contas a pagar",
      code: "CAP",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.teams, source)
  assert.equal(result.event, undefined)
  assert.equal(
    result.warning?.code,
    "team.update.no_changes"
  )
})

test("updateProjectedTeam rejects an archived team", () => {
  const result = updateProjectedTeam(
    [
      team({
        status: "archived",
      }),
    ],
    [department()],
    "change-1",
    {
      teamId: "team-1",
      name: "Tesouraria",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "team.update.archived"
  )
})

test("updateProjectedTeam rejects a duplicate name", () => {
  const result = updateProjectedTeam(
    [
      team(),
      team({
        id: "team-2",
        name: "Tesouraria",
        code: "TES",
      }),
    ],
    [department()],
    "change-1",
    {
      teamId: "team-2",
      name: " contas a pagar ",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "team.update.name_already_exists"
  )
})

test("updateProjectedTeam rejects a duplicate code", () => {
  const result = updateProjectedTeam(
    [
      team(),
      team({
        id: "team-2",
        name: "Tesouraria",
        code: "TES",
      }),
    ],
    [department()],
    "change-1",
    {
      teamId: "team-2",
      code: " cap ",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "team.update.code_already_exists"
  )
})

test("updateProjectedTeam rejects an unknown department", () => {
  const result = updateProjectedTeam(
    [team()],
    [department()],
    "change-1",
    {
      teamId: "team-1",
      departmentId: "department-missing",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "team.update.department_not_found"
  )
})

test("updateProjectedTeam rejects an archived department", () => {
  const result = updateProjectedTeam(
    [team()],
    [
      department({
        id: "department-2",
        name: "Controladoria",
        code: "CTL",
        status: "archived",
      }),
    ],
    "change-1",
    {
      teamId: "team-1",
      departmentId: "department-2",
    }
  )

  assert.equal(result.success, false)

  if (result.success) {
    return
  }

  assert.equal(
    result.issue.code,
    "team.update.department_archived"
  )
})

test("archiveProjectedTeam archives an active team", () => {
  const source = Object.freeze([team()])

  const result = archiveProjectedTeam(
    source,
    "change-1",
    {
      teamId: "team-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(
    result.teams[0]?.status,
    "archived"
  )

  assert.deepEqual(result.event, {
    type: "team.archived",
    changeSetId: "change-1",
    teamId: "team-1",
  })

  assert.equal(source[0]?.status, "active")
})

test("archiveProjectedTeam reports an already archived team as a warning", () => {
  const source = Object.freeze([
    team({
      status: "archived",
    }),
  ])

  const result = archiveProjectedTeam(
    source,
    "change-1",
    {
      teamId: "team-1",
    }
  )

  assert.equal(result.success, true)

  if (!result.success) {
    return
  }

  assert.equal(result.teams, source)
  assert.equal(result.event, undefined)
  assert.equal(
    result.warning?.code,
    "team.archive.already_archived"
  )
})

test("team operations are deterministic for equivalent inputs", () => {
  const teams = Object.freeze([team()])
  const departments = Object.freeze([department()])

  const first = updateProjectedTeam(
    teams,
    departments,
    "change-1",
    {
      teamId: "team-1",
      name: "Tesouraria",
    }
  )

  const second = updateProjectedTeam(
    teams,
    departments,
    "change-1",
    {
      teamId: "team-1",
      name: "Tesouraria",
    }
  )

  assert.deepEqual(first, second)
})
