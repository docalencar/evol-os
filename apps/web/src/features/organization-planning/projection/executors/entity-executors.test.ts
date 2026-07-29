import assert from "node:assert/strict"
import test from "node:test"

import type {
  ChangeSet,
  PlanningScenarioContract,
  PublishedSnapshotContract,
} from "../../types/planning-contracts"
import { ProjectionContext } from "../context"
import type {
  ProjectedDepartment,
  ProjectedOrganization,
  ProjectedPosition,
  ProjectedTeam,
} from "../contracts"
import {
  DEFAULT_CHANGE_SET_EXECUTORS,
  DepartmentExecutor,
  EmployeeExecutor,
  PositionExecutor,
  TeamExecutor,
} from "./entity-executors"

function snapshot(): PublishedSnapshotContract {
  return Object.freeze({
    id: "snapshot-1",
    companyId: "company-1",
    workspaceId: "workspace-1",
    sourceScenarioId: null,
    version: 1,
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
  })
}

function scenario(): PlanningScenarioContract {
  return Object.freeze({
    id: "scenario-1",
    companyId: "company-1",
    workspaceId: "workspace-1",
    baseSnapshotId: "snapshot-1",
    name: "Planejamento 2026",
    description: null,
    status: "draft",
    version: 1,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  })
}

function changeSet(
  changeType: string,
  payload: Readonly<Record<string, unknown>>,
  overrides: Partial<ChangeSet> = {}
): ChangeSet {
  return Object.freeze({
    id: "change-1",
    companyId: "company-1",
    scenarioId: "scenario-1",
    changeType,
    payload: Object.freeze({ ...payload }),
    version: 1,
    ...overrides,
  })
}

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

function contextWithOrganization(
  overrides: Partial<ProjectedOrganization> = {}
): ProjectionContext {
  const context = ProjectionContext.create(
    snapshot(),
    scenario(),
    []
  )

  return context.withOrganization({
    ...context.organization,
    ...overrides,
  })
}

test("default registry contains only implemented executors", () => {
  assert.deepEqual(
    DEFAULT_CHANGE_SET_EXECUTORS.map(
      (executor) => executor.name
    ),
    [
      new DepartmentExecutor().name,
      new TeamExecutor().name,
      new PositionExecutor().name,
      new EmployeeExecutor().name,
    ]
  )
})

test("TeamExecutor identifies supported team change types", () => {
  const executor = new TeamExecutor()

  assert.equal(
    executor.canExecute(
      changeSet("team.create", {})
    ),
    true
  )

  assert.equal(
    executor.canExecute(
      changeSet("team.update", {})
    ),
    true
  )

  assert.equal(
    executor.canExecute(
      changeSet("team.archive", {})
    ),
    true
  )

  assert.equal(
    executor.canExecute(
      changeSet("department.create", {})
    ),
    false
  )
})

test("TeamExecutor creates a team and records its event", () => {
  const executor = new TeamExecutor()
  const context = contextWithOrganization({
    departments: [department()],
  })

  const result = executor.execute(
    context,
    changeSet("team.create", {
      teamId: "team-1",
      name: " Contas a pagar ",
      code: " CAP ",
      description: " Pagamentos e fornecedores ",
      departmentId: "department-1",
    })
  )

  assert.deepEqual(result.organization.teams, [
    {
      id: "team-1",
      name: "Contas a pagar",
      code: "CAP",
      description: "Pagamentos e fornecedores",
      departmentId: "department-1",
      status: "active",
    },
  ])

  assert.deepEqual(result.events, [
    {
      type: "team.created",
      changeSetId: "change-1",
      teamId: "team-1",
    },
  ])

  assert.equal(result.warnings.length, 0)
  assert.equal(result.errors.length, 0)
  assert.equal(context.organization.teams.length, 0)
})

test("TeamExecutor updates a team and records changed fields", () => {
  const executor = new TeamExecutor()
  const context = contextWithOrganization({
    departments: [department()],
    teams: [team()],
  })

  const result = executor.execute(
    context,
    changeSet("team.update", {
      teamId: "team-1",
      name: "Tesouraria",
      description: "Gestão de caixa",
    })
  )

  assert.deepEqual(result.organization.teams, [
    {
      id: "team-1",
      name: "Tesouraria",
      code: "CAP",
      description: "Gestão de caixa",
      departmentId: "department-1",
      status: "active",
    },
  ])

  assert.deepEqual(result.events, [
    {
      type: "team.updated",
      changeSetId: "change-1",
      teamId: "team-1",
      changedFields: [
        "name",
        "description",
      ],
    },
  ])

  assert.equal(result.warnings.length, 0)
  assert.equal(result.errors.length, 0)
  assert.equal(
    context.organization.teams[0]?.name,
    "Contas a pagar"
  )
})

test("TeamExecutor records a warning for an idempotent update", () => {
  const executor = new TeamExecutor()
  const teams = Object.freeze([team()])
  const context = contextWithOrganization({
    departments: [department()],
    teams,
  })

  const result = executor.execute(
    context,
    changeSet("team.update", {
      teamId: "team-1",
      name: "Contas a pagar",
      code: "CAP",
    })
  )

  assert.deepEqual(result.organization.teams, teams)
  assert.equal(result.events.length, 0)
  assert.equal(result.errors.length, 0)

  assert.deepEqual(result.warnings, [
    {
      code: "team.update.no_changes",
      message:
        "A atualização do time team-1 não produz alterações.",
      changeSetId: "change-1",
    },
  ])
})

test("TeamExecutor archives a team and records its event", () => {
  const executor = new TeamExecutor()
  const context = contextWithOrganization({
    departments: [department()],
    teams: [team()],
  })

  const result = executor.execute(
    context,
    changeSet("team.archive", {
      teamId: "team-1",
    })
  )

  assert.equal(
    result.organization.teams[0]?.status,
    "archived"
  )

  assert.deepEqual(result.events, [
    {
      type: "team.archived",
      changeSetId: "change-1",
      teamId: "team-1",
    },
  ])

  assert.equal(result.warnings.length, 0)
  assert.equal(result.errors.length, 0)
  assert.equal(
    context.organization.teams[0]?.status,
    "active"
  )
})

test("TeamExecutor records a warning when the team is already archived", () => {
  const executor = new TeamExecutor()
  const teams = Object.freeze([
    team({
      status: "archived",
    }),
  ])

  const context = contextWithOrganization({
    departments: [department()],
    teams,
  })

  const result = executor.execute(
    context,
    changeSet("team.archive", {
      teamId: "team-1",
    })
  )

  assert.deepEqual(result.organization.teams, teams)
  assert.equal(result.events.length, 0)
  assert.equal(result.errors.length, 0)

  assert.deepEqual(result.warnings, [
    {
      code: "team.archive.already_archived",
      message: "O time team-1 já está arquivado.",
      changeSetId: "change-1",
    },
  ])
})

test("TeamExecutor records parser errors without changing the organization", () => {
  const executor = new TeamExecutor()
  const context = contextWithOrganization({
    departments: [department()],
  })

  const result = executor.execute(
    context,
    changeSet("team.create", {
      teamId: "team-1",
      name: "Contas a pagar",
      departmentId: 123,
    })
  )

  assert.equal(
    result.organization,
    context.organization
  )

  assert.equal(result.events.length, 0)
  assert.equal(result.warnings.length, 0)

  assert.deepEqual(result.errors, [
    {
      code: "team.change_set.invalid_payload",
      message:
        "O campo departmentId do change set change-1 deve ser uma string.",
      changeSetId: "change-1",
    },
  ])
})

test("TeamExecutor records mutation errors without changing the organization", () => {
  const executor = new TeamExecutor()
  const context = contextWithOrganization({
    departments: [],
  })

  const result = executor.execute(
    context,
    changeSet("team.create", {
      teamId: "team-1",
      name: "Contas a pagar",
      code: "CAP",
      description: null,
      departmentId: "department-missing",
    })
  )

  assert.equal(
    result.organization,
    context.organization
  )

  assert.equal(result.events.length, 0)
  assert.equal(result.warnings.length, 0)

  assert.deepEqual(result.errors, [
    {
      code: "team.create.department_not_found",
      message:
        "O departamento department-missing não foi encontrado.",
      changeSetId: "change-1",
    },
  ])
})

test("TeamExecutor execution is deterministic for equivalent inputs", () => {
  const executor = new TeamExecutor()
  const context = contextWithOrganization({
    departments: [department()],
    teams: [team()],
  })

  const input = changeSet("team.update", {
    teamId: "team-1",
    name: "Tesouraria",
  })

  const first = executor.execute(context, input)
  const second = executor.execute(context, input)

  assert.deepEqual(
    first.organization,
    second.organization
  )

  assert.deepEqual(first.events, second.events)
  assert.deepEqual(first.warnings, second.warnings)
  assert.deepEqual(first.errors, second.errors)
})

test("PositionExecutor identifies supported position change types", () => {
  const executor = new PositionExecutor()

  assert.equal(
    executor.canExecute(
      changeSet("position.create", {})
    ),
    true
  )

  assert.equal(
    executor.canExecute(
      changeSet("position.update", {})
    ),
    true
  )

  assert.equal(
    executor.canExecute(
      changeSet("position.archive", {})
    ),
    true
  )

  assert.equal(
    executor.canExecute(
      changeSet("position.move", {})
    ),
    true
  )

  assert.equal(
    executor.canExecute(
      changeSet("team.create", {})
    ),
    false
  )
})

test("PositionExecutor creates a position and records its event", () => {
  const executor = new PositionExecutor()
  const context = contextWithOrganization({
    departments: [department()],
  })

  const result = executor.execute(
    context,
    changeSet("position.create", {
      positionId: "position-1",
      name: " Analista financeiro ",
      description: " Análises e controles financeiros ",
      departmentId: "department-1",
      hierarchicalLevel: "analyst",
      weeklyWorkloadHours: 40,
      workModel: "hybrid",
      employmentType: "clt",
      travelRequirement: "none",
    })
  )

  assert.deepEqual(result.organization.positions, [
    {
      id: "position-1",
      name: "Analista financeiro",
      description:
        "Análises e controles financeiros",
      departmentId: "department-1",
      hierarchicalLevel: "analyst",
      weeklyWorkloadHours: 40,
      workModel: "hybrid",
      employmentType: "clt",
      travelRequirement: "none",
      status: "active",
    },
  ])

  assert.deepEqual(result.events, [
    {
      type: "position.created",
      changeSetId: "change-1",
      positionId: "position-1",
    },
  ])

  assert.equal(result.warnings.length, 0)
  assert.equal(result.errors.length, 0)
  assert.equal(
    context.organization.positions.length,
    0
  )
})

test("PositionExecutor updates a position and records changed fields", () => {
  const executor = new PositionExecutor()
  const context = contextWithOrganization({
    departments: [department()],
    positions: [position()],
  })

  const result = executor.execute(
    context,
    changeSet("position.update", {
      positionId: "position-1",
      name: "Especialista financeiro",
      description: "Planejamento financeiro",
      hierarchicalLevel: "specialist",
      weeklyWorkloadHours: 44,
      workModel: "remote",
      employmentType: "pj",
      travelRequirement: "occasional",
    })
  )

  assert.deepEqual(result.organization.positions, [
    {
      id: "position-1",
      name: "Especialista financeiro",
      description: "Planejamento financeiro",
      departmentId: "department-1",
      hierarchicalLevel: "specialist",
      weeklyWorkloadHours: 44,
      workModel: "remote",
      employmentType: "pj",
      travelRequirement: "occasional",
      status: "active",
    },
  ])

  assert.deepEqual(result.events, [
    {
      type: "position.updated",
      changeSetId: "change-1",
      positionId: "position-1",
      changedFields: [
        "name",
        "description",
        "hierarchicalLevel",
        "weeklyWorkloadHours",
        "workModel",
        "employmentType",
        "travelRequirement",
      ],
    },
  ])

  assert.equal(result.warnings.length, 0)
  assert.equal(result.errors.length, 0)

  assert.equal(
    context.organization.positions[0]?.name,
    "Analista financeiro"
  )
})

test("PositionExecutor records a warning for an idempotent update", () => {
  const executor = new PositionExecutor()
  const positions = Object.freeze([position()])
  const context = contextWithOrganization({
    departments: [department()],
    positions,
  })

  const result = executor.execute(
    context,
    changeSet("position.update", {
      positionId: "position-1",
      name: "Analista financeiro",
      description: null,
      hierarchicalLevel: "analyst",
      weeklyWorkloadHours: 40,
      workModel: "hybrid",
      employmentType: "clt",
      travelRequirement: "none",
    })
  )

  assert.deepEqual(
    result.organization.positions,
    positions
  )

  assert.equal(result.events.length, 0)
  assert.equal(result.errors.length, 0)

  assert.deepEqual(result.warnings, [
    {
      code: "position.update.no_changes",
      message:
        "A atualização do cargo position-1 não produz alterações.",
      changeSetId: "change-1",
    },
  ])
})

test("PositionExecutor archives a position and records its event", () => {
  const executor = new PositionExecutor()
  const context = contextWithOrganization({
    departments: [department()],
    positions: [position()],
  })

  const result = executor.execute(
    context,
    changeSet("position.archive", {
      positionId: "position-1",
    })
  )

  assert.equal(
    result.organization.positions[0]?.status,
    "archived"
  )

  assert.deepEqual(result.events, [
    {
      type: "position.archived",
      changeSetId: "change-1",
      positionId: "position-1",
    },
  ])

  assert.equal(result.warnings.length, 0)
  assert.equal(result.errors.length, 0)

  assert.equal(
    context.organization.positions[0]?.status,
    "active"
  )
})

test("PositionExecutor records a warning when the position is already archived", () => {
  const executor = new PositionExecutor()
  const positions = Object.freeze([
    position({
      status: "archived",
    }),
  ])

  const context = contextWithOrganization({
    departments: [department()],
    positions,
  })

  const result = executor.execute(
    context,
    changeSet("position.archive", {
      positionId: "position-1",
    })
  )

  assert.deepEqual(
    result.organization.positions,
    positions
  )

  assert.equal(result.events.length, 0)
  assert.equal(result.errors.length, 0)

  assert.deepEqual(result.warnings, [
    {
      code: "position.archive.already_archived",
      message:
        "O cargo position-1 já está arquivado.",
      changeSetId: "change-1",
    },
  ])
})

test("PositionExecutor moves a position and records its event", () => {
  const executor = new PositionExecutor()

  const destinationDepartment = department({
    id: "department-2",
    name: "Controladoria",
    code: "CTR",
  })

  const context = contextWithOrganization({
    departments: [
      department(),
      destinationDepartment,
    ],
    positions: [position()],
  })

  const result = executor.execute(
    context,
    changeSet("position.move", {
      positionId: "position-1",
      departmentId: "department-2",
    })
  )

  assert.equal(
    result.organization.positions[0]
      ?.departmentId,
    "department-2"
  )

  assert.deepEqual(result.events, [
    {
      type: "position.moved",
      changeSetId: "change-1",
      positionId: "position-1",
      previousDepartmentId: "department-1",
      departmentId: "department-2",
    },
  ])

  assert.equal(result.warnings.length, 0)
  assert.equal(result.errors.length, 0)

  assert.equal(
    context.organization.positions[0]
      ?.departmentId,
    "department-1"
  )
})

test("PositionExecutor records a warning for an idempotent move", () => {
  const executor = new PositionExecutor()
  const positions = Object.freeze([position()])

  const context = contextWithOrganization({
    departments: [department()],
    positions,
  })

  const result = executor.execute(
    context,
    changeSet("position.move", {
      positionId: "position-1",
      departmentId: "department-1",
    })
  )

  assert.deepEqual(
    result.organization.positions,
    positions
  )

  assert.equal(result.events.length, 0)
  assert.equal(result.errors.length, 0)

  assert.deepEqual(result.warnings, [
    {
      code: "position.move.no_changes",
      message:
        "A movimentação do cargo position-1 não produz alterações.",
      changeSetId: "change-1",
    },
  ])
})

test("PositionExecutor records parser errors without changing the organization", () => {
  const executor = new PositionExecutor()
  const context = contextWithOrganization({
    departments: [department()],
  })

  const result = executor.execute(
    context,
    changeSet("position.create", {
      positionId: "position-1",
      name: "Analista financeiro",
      description: null,
      departmentId: "department-1",
      hierarchicalLevel: "analyst",
      weeklyWorkloadHours: "40",
      workModel: "hybrid",
      employmentType: "clt",
      travelRequirement: "none",
    })
  )

  assert.equal(
    result.organization,
    context.organization
  )

  assert.equal(result.events.length, 0)
  assert.equal(result.warnings.length, 0)

  assert.deepEqual(result.errors, [
    {
      code: "position.change_set.invalid_payload",
      message:
        "O campo weeklyWorkloadHours do change set change-1 deve ser um número inteiro entre 1 e 168.",
      changeSetId: "change-1",
    },
  ])
})

test("PositionExecutor records mutation errors without changing the organization", () => {
  const executor = new PositionExecutor()
  const context = contextWithOrganization({
    departments: [],
  })

  const result = executor.execute(
    context,
    changeSet("position.create", {
      positionId: "position-1",
      name: "Analista financeiro",
      description: null,
      departmentId: "department-missing",
      hierarchicalLevel: "analyst",
      weeklyWorkloadHours: 40,
      workModel: "hybrid",
      employmentType: "clt",
      travelRequirement: "none",
    })
  )

  assert.equal(
    result.organization,
    context.organization
  )

  assert.equal(result.events.length, 0)
  assert.equal(result.warnings.length, 0)

  assert.deepEqual(result.errors, [
    {
      code:
        "position.create.department_not_found",
      message:
        "O departamento department-missing não foi encontrado.",
      changeSetId: "change-1",
    },
  ])
})

test("PositionExecutor execution is deterministic for equivalent inputs", () => {
  const executor = new PositionExecutor()
  const context = contextWithOrganization({
    departments: [department()],
    positions: [position()],
  })

  const input = changeSet("position.update", {
    positionId: "position-1",
    name: "Especialista financeiro",
    hierarchicalLevel: "specialist",
  })

  const first = executor.execute(context, input)
  const second = executor.execute(context, input)

  assert.deepEqual(
    first.organization,
    second.organization
  )

  assert.deepEqual(first.events, second.events)
  assert.deepEqual(
    first.warnings,
    second.warnings
  )
  assert.deepEqual(first.errors, second.errors)
})
