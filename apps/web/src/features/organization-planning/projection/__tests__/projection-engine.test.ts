import assert from "node:assert/strict"
import test from "node:test"
import type { ChangeSetExecutor } from "../executors"
import { ProjectionContext } from "../context"
import { ProjectionEngine } from "../engine"
import { DepartmentExecutor } from "../executors"
import { ProjectionPipeline } from "../pipeline"
import { ProjectionResult } from "../result"
import { ScenarioExecutor } from "../execution"
import { ProjectionContractValidator } from "../validators"
import type {
  ChangeSet,
  PlanningScenarioContract,
  PublishedSnapshotContract,
} from "../../types/planning-contracts"
import type {
  ProjectedDepartment,
  ProjectedOrganization,
  ProjectedPosition,
  ProjectedTeam,
  ProjectionSnapshot,
} from "../contracts"

const snapshot: PublishedSnapshotContract = Object.freeze({
  id: "snapshot-1",
  companyId: "company-1",
  workspaceId: "workspace-1",
  sourceScenarioId: null,
  version: 1,
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
})

const scenario: PlanningScenarioContract = Object.freeze({
  id: "scenario-1",
  companyId: "company-1",
  workspaceId: "workspace-1",
  baseSnapshotId: "snapshot-1",
  name: "Cenário",
  description: null,
  status: "draft",
  version: 1,
  createdAt: new Date("2026-01-02T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
})

function changeSet(
  id: string,
  version: number,
  changeType = "department.create",
  payload: Readonly<Record<string, unknown>> = {}
): ChangeSet {
  return Object.freeze({
    id,
    companyId: "company-1",
    scenarioId: "scenario-1",
    changeType,
    payload: Object.freeze({ ...payload }),
    version,
  })
}

test("ProjectionContext starts with an immutable empty organization", () => {
  const source = [changeSet("change-1", 1)]
  const context = ProjectionContext.create(snapshot, scenario, source)
  source.push(changeSet("change-2", 2))

  assert.equal(context.changeSets.length, 1)
  assert.deepEqual(context.organization.departments, [])
  assert.equal(Object.isFrozen(context.organization), true)
  assert.equal(Object.isFrozen(context.organization.departments), true)
  assert.throws(() => {
    ;(context.organization.departments as unknown as { id: string }[]).push({
      id: "department-1",
    })
  }, TypeError)
})

test("ProjectionContext hydrates every collection from the snapshot without mutating it", () => {
  const organization = snapshotOrganization({
    departments: [projectedDepartment()],
    teams: [projectedTeam()],
    positions: [projectedPosition()],
    employees: [{ id: "employee-1", positionId: "position-1" }],
    vacancies: [{ id: "vacancy-1", positionId: "position-1" }],
  })
  const sourceDepartments = organization.departments
  const hydratedSnapshot = projectionSnapshot(organization)
  const context = ProjectionContext.create(
    hydratedSnapshot,
    scenario,
    []
  )

  assert.deepEqual(context.organization, organization)
  assert.notEqual(
    context.organization.departments,
    sourceDepartments
  )
  assert.equal(Object.isFrozen(context.organization), true)
  assert.equal(
    Object.isFrozen(context.organization.employees[0]),
    true
  )
  assert.deepEqual(hydratedSnapshot.organization, organization)
})

test("ProjectionEngine updates a department hydrated from the snapshot", () => {
  const hydratedSnapshot = projectionSnapshot(
    snapshotOrganization({
      departments: [projectedDepartment()],
    })
  )
  const result = ProjectionEngine.create().project({
    snapshot: hydratedSnapshot,
    scenario,
    changeSets: [
      changeSet("change-department-update", 1, "department.update", {
        departmentId: "department-1",
        name: "Finanças",
      }),
    ],
  })

  assert.equal(result.isValid, true)
  assert.equal(result.organization.departments[0]?.name, "Finanças")
  assert.equal(
    hydratedSnapshot.organization?.departments[0]?.name,
    "Financeiro"
  )
})

test("ProjectionEngine archives a department hydrated from the snapshot", () => {
  const hydratedSnapshot = projectionSnapshot(
    snapshotOrganization({
      departments: [projectedDepartment()],
    })
  )
  const result = ProjectionEngine.create().project({
    snapshot: hydratedSnapshot,
    scenario,
    changeSets: [
      changeSet("change-department-archive", 1, "department.archive", {
        departmentId: "department-1",
      }),
    ],
  })

  assert.equal(result.isValid, true)
  assert.equal(
    result.organization.departments[0]?.status,
    "archived"
  )
  assert.equal(
    hydratedSnapshot.organization?.departments[0]?.status,
    "active"
  )
})

test("ProjectionEngine updates a team hydrated from the snapshot", () => {
  const hydratedSnapshot = projectionSnapshot(
    snapshotOrganization({
      departments: [projectedDepartment()],
      teams: [projectedTeam()],
    })
  )
  const result = ProjectionEngine.create().project({
    snapshot: hydratedSnapshot,
    scenario,
    changeSets: [
      changeSet("change-team-update", 1, "team.update", {
        teamId: "team-1",
        name: "Controladoria",
      }),
    ],
  })

  assert.equal(result.isValid, true)
  assert.equal(result.organization.teams[0]?.name, "Controladoria")
  assert.equal(
    hydratedSnapshot.organization?.teams[0]?.name,
    "Contas a pagar"
  )
})

test("ProjectionEngine updates a position hydrated from the snapshot", () => {
  const hydratedSnapshot = projectionSnapshot(
    snapshotOrganization({
      departments: [projectedDepartment()],
      positions: [projectedPosition()],
    })
  )
  const result = ProjectionEngine.create().project({
    snapshot: hydratedSnapshot,
    scenario,
    changeSets: [
      changeSet("change-position-update", 1, "position.update", {
        positionId: "position-1",
        name: "Especialista financeiro",
      }),
    ],
  })

  assert.equal(result.isValid, true)
  assert.equal(
    result.organization.positions[0]?.name,
    "Especialista financeiro"
  )
  assert.equal(
    hydratedSnapshot.organization?.positions[0]?.name,
    "Analista financeiro"
  )
})

test("ProjectionEngine combines hydrated and newly created entities deterministically", () => {
  const hydratedSnapshot = projectionSnapshot(
    snapshotOrganization({
      departments: [projectedDepartment()],
    })
  )
  const input = {
    snapshot: hydratedSnapshot,
    scenario,
    changeSets: [
      changeSet("change-new-department", 1, "department.create", {
        departmentId: "department-2",
        name: "Pessoas",
      }),
    ],
  }

  const first = ProjectionEngine.create().project(input)
  const second = ProjectionEngine.create().project(input)

  assert.deepEqual(first, second)
  assert.deepEqual(
    first.organization.departments.map((department) => department.id),
    ["department-1", "department-2"]
  )
  assert.equal(Object.isFrozen(first.organization), true)
  assert.deepEqual(
    hydratedSnapshot.organization?.departments.map(
      (department) => department.id
    ),
    ["department-1"]
  )
})

test("Pipeline discovers the executor and records its execution", () => {
  const context = ProjectionContext.create(snapshot, scenario, [
    changeSet("change-1", 1, "department.create", {
      departmentId: "department-1",
      name: "Financeiro",
    }),
  ])
  const projected = new ProjectionPipeline([new DepartmentExecutor()]).execute(context)

  assert.deepEqual(
    projected.events.filter(
      (event) => event.type === "change-set.executed"
    ),
    [{
      type: "change-set.executed",
      changeSetId: "change-1",
      executor: "DepartmentExecutor",
    }]
  )
  assert.deepEqual(projected.warnings, [])
})

test("Pipeline reports an unsupported change set without mutating the state", () => {
  const context = ProjectionContext.create(snapshot, scenario, [
    changeSet("change-1", 1, "unknown.change"),
  ])
  const projected = new ProjectionPipeline([]).execute(context)

  assert.equal(projected.organization, context.organization)
  assert.equal(projected.warnings[0]?.code, "unhandled_change_set")
  assert.equal(projected.events[0]?.type, "change-set.unhandled")
})

test("default pipeline continues around an unknown change set", () => {
  const changeSets = [
    changeSet("change-department", 1, "department.create", {
      departmentId: "department-1",
      name: "Financeiro",
    }),
    changeSet("change-unknown", 2, "unknown.change"),
    changeSet("change-position", 3, "position.create", {
      positionId: "position-1",
      name: "Analista financeiro",
      departmentId: "department-1",
      hierarchicalLevel: "analyst",
      weeklyWorkloadHours: 40,
      workModel: "hybrid",
      employmentType: "clt",
      travelRequirement: "none",
    }),
  ]
  const projection = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets,
  })
  const execution = ScenarioExecutor.create(
    () => Date.parse("2026-01-03T00:00:00.000Z")
  ).execute({
    snapshot,
    scenario,
    changeSets,
  })

  assert.deepEqual(
    projection.events
      .filter((event) => event.type === "change-set.executed")
      .map((event) => event.changeSetId),
    ["change-department", "change-position"]
  )
  assert.deepEqual(
    projection.events
      .filter((event) => event.type === "change-set.unhandled")
      .map((event) => event.changeSetId),
    ["change-unknown"]
  )
  assert.equal(
    projection.warnings[0]?.code,
    "unhandled_change_set"
  )
  assert.equal(projection.organization.departments.length, 1)
  assert.equal(projection.organization.positions.length, 1)
  assert.deepEqual(
    execution.executedChangeSets.map((current) => current.id),
    ["change-department", "change-position"]
  )
})

test("Pipeline continues after a failed change set and records only completed executions", () => {
  const executed: string[] = []
  const executor: ChangeSetExecutor = {
    name: "FailingExecutor",
    canExecute: () => true,
    execute: (context, currentChangeSet) => {
      executed.push(currentChangeSet.id)

      if (currentChangeSet.id === "change-2") {
        return context.addError(Object.freeze({
          code: "execution_failed",
          message: "Falha de execução.",
          changeSetId: currentChangeSet.id,
        }))
      }

      return context
    },
  }
  const context = ProjectionContext.create(snapshot, scenario, [
    changeSet("change-1", 1),
    changeSet("change-2", 2),
    changeSet("change-3", 3),
  ])

  const projected = new ProjectionPipeline([executor]).execute(context)

  assert.deepEqual(executed, ["change-1", "change-2", "change-3"])
  assert.deepEqual(
    projected.events.map((event) =>
      event.type === "change-set.executed" ? event.changeSetId : null
    ),
    ["change-1", "change-3"]
  )
  assert.equal(projected.errors[0]?.changeSetId, "change-2")
})

test("ProjectionEngine executes change sets by version and id", () => {
  const order: string[] = []
  const executor: ChangeSetExecutor = {
    name: "RecordingExecutor",
    canExecute: () => true,
    execute: (context, currentChangeSet) => {
      order.push(currentChangeSet.id)
      return context
    },
  }
  const engine = ProjectionEngine.create([executor])

  engine.project({
    snapshot,
    scenario,
    changeSets: [changeSet("change-c", 2), changeSet("change-b", 1), changeSet("change-a", 1)],
  })

  assert.deepEqual(order, ["change-a", "change-b", "change-c"])
})

test("ProjectionEngine is deterministic for equivalent inputs", () => {
  const engine = ProjectionEngine.create()
  const input = {
    snapshot,
    scenario,
    changeSets: [changeSet("change-b", 2), changeSet("change-a", 1)],
  }

  assert.deepEqual(engine.project(input), engine.project(input))
})

test("ProjectionEngine recalculates the structural metric scaffold", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [],
  })

  assert.deepEqual(result.metrics, {
    headcount: 0,
    vacancies: 0,
    salaryMass: 0,
    departments: 0,
    positions: 0,
  })
  assert.equal(result.metrics, result.organization.metrics)
})

test("ProjectionEngine freezes state produced by an executor", () => {
  const executor: ChangeSetExecutor = {
    name: "MutableOutputExecutor",
    canExecute: () => true,
    execute: (context) => context.withOrganization({
      ...context.organization,
      departments: [{
        id: "department-1",
        name: "Departamento",
        code: null,
        description: null,
        parentDepartmentId: null,
        status: "active",
      }],
    }),
  }
  const result = ProjectionEngine.create([executor]).project({
    snapshot,
    scenario,
    changeSets: [changeSet("change-1", 1)],
  })

  assert.equal(result.metrics.departments, 1)
  assert.equal(Object.isFrozen(result.organization.departments), true)
  assert.equal(Object.isFrozen(result.organization.departments[0]), true)
})

test("ProjectionContractValidator detects snapshot, workspace and change-set scope errors", () => {
  const invalidScenario = Object.freeze({
    ...scenario,
    companyId: "company-2",
    workspaceId: "workspace-2",
    baseSnapshotId: "snapshot-2",
  })
  const context = ProjectionContext.create(snapshot, invalidScenario, [changeSet("change-1", 1)])
  const errors = new ProjectionContractValidator().validate(context)

  assert.deepEqual(errors.map((error) => error.code), [
    "company_mismatch",
    "workspace_mismatch",
    "base_snapshot_mismatch",
    "change_set_scope_mismatch",
  ])
})

test("ProjectionResult freezes its result collections and exposes validity", () => {
  const context = ProjectionContext.create(snapshot, scenario, [])
  const result = ProjectionResult.create({ organization: context.organization })

  assert.equal(result.isValid, true)
  assert.equal(Object.isFrozen(result), true)
  assert.equal(Object.isFrozen(result.warnings), true)
  assert.equal(Object.isFrozen(result.errors), true)
})

function departmentChangeSet(
  id: string,
  version: number,
  changeType:
    | "department.create"
    | "department.update"
    | "department.archive",
  payload: Readonly<Record<string, unknown>>
): ChangeSet {
  return Object.freeze({
    id,
    companyId: "company-1",
    scenarioId: "scenario-1",
    changeType,
    payload: Object.freeze({ ...payload }),
    version,
  })
}

test("DepartmentExecutor creates, updates and archives departments", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      departmentChangeSet(
        "change-1",
        1,
        "department.create",
        {
          departmentId: "department-1",
          name: " Financeiro ",
          code: " FIN ",
        }
      ),
      departmentChangeSet(
        "change-2",
        2,
        "department.update",
        {
          departmentId: "department-1",
          name: "Finanças",
          description: "Área financeira",
        }
      ),
      departmentChangeSet(
        "change-3",
        3,
        "department.archive",
        {
          departmentId: "department-1",
        }
      ),
    ],
  })

  assert.equal(result.isValid, true)
  assert.deepEqual(result.organization.departments, [
    {
      id: "department-1",
      name: "Finanças",
      code: "FIN",
      description: "Área financeira",
      parentDepartmentId: null,
      status: "archived",
    },
  ])
  assert.equal(result.metrics.departments, 1)
  assert.deepEqual(result.warnings, [])
})

test("DepartmentExecutor preserves hierarchy between sequential change sets", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      departmentChangeSet(
        "change-1",
        1,
        "department.create",
        {
          departmentId: "department-parent",
          name: "Operações",
        }
      ),
      departmentChangeSet(
        "change-2",
        2,
        "department.create",
        {
          departmentId: "department-child",
          name: "Logística",
          parentDepartmentId:
            "department-parent",
        }
      ),
    ],
  })

  assert.equal(result.isValid, true)
  assert.equal(
    result.organization.departments[1]
      ?.parentDepartmentId,
    "department-parent"
  )
})

test("DepartmentExecutor rejects duplicate active names", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      departmentChangeSet(
        "change-1",
        1,
        "department.create",
        {
          departmentId: "department-1",
          name: "Financeiro",
        }
      ),
      departmentChangeSet(
        "change-2",
        2,
        "department.create",
        {
          departmentId: "department-2",
          name: " financeiro ",
        }
      ),
    ],
  })

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors[0]?.code,
    "department.create.name_already_exists"
  )
  assert.equal(
    result.organization.departments.length,
    1
  )
})

test("DepartmentExecutor reports invalid payloads as projection errors", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      departmentChangeSet(
        "change-1",
        1,
        "department.create",
        {
          departmentId: "department-1",
        }
      ),
    ],
  })

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors[0]?.code,
    "department.change_set.invalid_payload"
  )
  assert.deepEqual(
    result.organization.departments,
    []
  )
})

test("DepartmentExecutor emits warning for idempotent update", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      departmentChangeSet(
        "change-1",
        1,
        "department.create",
        {
          departmentId: "department-1",
          name: "Financeiro",
        }
      ),
      departmentChangeSet(
        "change-2",
        2,
        "department.update",
        {
          departmentId: "department-1",
          name: "Financeiro",
        }
      ),
    ],
  })

  assert.equal(result.isValid, true)
  assert.equal(
    result.warnings[0]?.code,
    "department.update.no_changes"
  )
})

test("DepartmentExecutor blocks hierarchy cycles", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      departmentChangeSet(
        "change-1",
        1,
        "department.create",
        {
          departmentId: "department-a",
          name: "Departamento A",
        }
      ),
      departmentChangeSet(
        "change-2",
        2,
        "department.create",
        {
          departmentId: "department-b",
          name: "Departamento B",
          parentDepartmentId: "department-a",
        }
      ),
      departmentChangeSet(
        "change-3",
        3,
        "department.update",
        {
          departmentId: "department-a",
          parentDepartmentId: "department-b",
        }
      ),
    ],
  })

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors[0]?.code,
    "department.update.hierarchy_cycle"
  )
  assert.equal(
    result.organization.departments[0]
      ?.parentDepartmentId,
    null
  )
})

test("DepartmentExecutor blocks archive with active children", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      departmentChangeSet(
        "change-1",
        1,
        "department.create",
        {
          departmentId: "department-parent",
          name: "Operações",
        }
      ),
      departmentChangeSet(
        "change-2",
        2,
        "department.create",
        {
          departmentId: "department-child",
          name: "Logística",
          parentDepartmentId:
            "department-parent",
        }
      ),
      departmentChangeSet(
        "change-3",
        3,
        "department.archive",
        {
          departmentId: "department-parent",
        }
      ),
    ],
  })

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors[0]?.code,
    "department.archive.has_active_children"
  )
  assert.equal(
    result.organization.departments[0]?.status,
    "active"
  )
})

test("DepartmentExecutor produces deterministic immutable results", () => {
  const input = {
    snapshot,
    scenario,
    changeSets: [
      departmentChangeSet(
        "change-1",
        1,
        "department.create",
        {
          departmentId: "department-1",
          name: "Financeiro",
          code: "FIN",
        }
      ),
    ],
  }

  const first =
    ProjectionEngine.create().project(input)
  const second =
    ProjectionEngine.create().project(input)

  assert.deepEqual(first, second)
  assert.equal(
    Object.isFrozen(
      first.organization.departments
    ),
    true
  )
  assert.equal(
    Object.isFrozen(
      first.organization.departments[0]
    ),
    true
  )
})

test("ProjectionEngine does not apply an out-of-scope change set", () => {
  const executed: string[] = []
  const recordingExecutor: ChangeSetExecutor = {
    name: "RecordingExecutor",
    canExecute: () => true,
    execute: (context, currentChangeSet) => {
      executed.push(currentChangeSet.id)
      return context
    },
  }
  const outOfScope: ChangeSet = Object.freeze({
    id: "change-out",
    companyId: "company-2",
    scenarioId: "scenario-1",
    changeType: "department.create",
    payload: Object.freeze({
      departmentId: "department-1",
      name: "Financeiro",
    }),
    version: 1,
  })

  const result = ProjectionEngine.create([
    recordingExecutor,
  ]).project({
    snapshot,
    scenario,
    changeSets: [outOfScope],
  })

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors.some(
      (error) =>
        error.code === "change_set_scope_mismatch"
    ),
    true
  )
  assert.deepEqual(
    result.organization.departments,
    []
  )
  assert.deepEqual(result.warnings, [])
  assert.deepEqual(executed, [])
})

test("ProjectionEngine skips execution when a change set is out of scope", () => {
  const executed: string[] = []
  const recordingExecutor: ChangeSetExecutor = {
    name: "RecordingExecutor",
    canExecute: () => true,
    execute: (context, currentChangeSet) => {
      executed.push(currentChangeSet.id)
      return context
    },
  }

  const outOfScope: ChangeSet = Object.freeze({
    id: "change-out",
    companyId: "company-1",
    scenarioId: "scenario-2",
    changeType: "department.create",
    payload: Object.freeze({
      departmentId: "department-1",
      name: "Financeiro",
    }),
    version: 1,
  })

  const result = ProjectionEngine.create([
    recordingExecutor,
  ]).project({
    snapshot,
    scenario,
    changeSets: [outOfScope],
  })

  assert.deepEqual(executed, [])
  assert.equal(result.isValid, false)
  assert.equal(
    result.errors.some(
      (error) =>
        error.code === "change_set_scope_mismatch"
    ),
    true
  )
  assert.deepEqual(
    result.organization.departments,
    []
  )
  assert.deepEqual(result.warnings, [])
})

test("ProjectionEngine rejects department archive with an active team", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      organizationalChangeSet(
        "change-1",
        1,
        "department.create",
        {
          departmentId: "department-1",
          name: "Financeiro",
        }
      ),
      organizationalChangeSet(
        "change-2",
        2,
        "team.create",
        {
          teamId: "team-1",
          name: "Contas a pagar",
          departmentId: "department-1",
        }
      ),
      organizationalChangeSet(
        "change-3",
        3,
        "department.archive",
        {
          departmentId: "department-1",
        }
      ),
    ],
  })

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors[0]?.code,
    "department.archive.has_active_teams"
  )
  assert.equal(
    result.organization.departments[0]?.status,
    "active"
  )
  assert.equal(
    result.organization.teams[0]?.status,
    "active"
  )
})

test("ProjectionEngine rejects department archive with an active position", () => {
  const result = ProjectionEngine.create().project({
    snapshot,
    scenario,
    changeSets: [
      organizationalChangeSet(
        "change-1",
        1,
        "department.create",
        {
          departmentId: "department-1",
          name: "Financeiro",
        }
      ),
      organizationalChangeSet(
        "change-2",
        2,
        "position.create",
        {
          positionId: "position-1",
          name: "Analista financeiro",
          departmentId: "department-1",
          hierarchicalLevel: "analyst",
          weeklyWorkloadHours: 40,
          workModel: "hybrid",
          employmentType: "clt",
          travelRequirement: "none",
        }
      ),
      organizationalChangeSet(
        "change-3",
        3,
        "department.archive",
        {
          departmentId: "department-1",
        }
      ),
    ],
  })

  assert.equal(result.isValid, false)
  assert.equal(
    result.errors[0]?.code,
    "department.archive.has_active_positions"
  )
  assert.equal(
    result.organization.departments[0]?.status,
    "active"
  )
  assert.equal(
    result.organization.positions[0]?.status,
    "active"
  )
})

function organizationalChangeSet(
  id: string,
  version: number,
  changeType: string,
  payload: Readonly<Record<string, unknown>>
): ChangeSet {
  return Object.freeze({
    id,
    companyId: "company-1",
    scenarioId: "scenario-1",
    changeType,
    payload: Object.freeze({ ...payload }),
    version,
  })
}

function projectionSnapshot(
  organization: ProjectedOrganization
): ProjectionSnapshot {
  return {
    ...snapshot,
    organization,
  }
}

function snapshotOrganization(
  overrides: Partial<ProjectedOrganization> = {}
): ProjectedOrganization {
  return {
    departments: [],
    teams: [],
    positions: [],
    employees: [],
    vacancies: [],
    metrics: {
      headcount: 0,
      vacancies: 0,
      salaryMass: 0,
      departments: 0,
      positions: 0,
    },
    ...overrides,
  }
}

function projectedDepartment(
  overrides: Partial<ProjectedDepartment> = {}
): ProjectedDepartment {
  return {
    id: "department-1",
    name: "Financeiro",
    code: "FIN",
    description: null,
    parentDepartmentId: null,
    status: "active",
    ...overrides,
  }
}

function projectedTeam(
  overrides: Partial<ProjectedTeam> = {}
): ProjectedTeam {
  return {
    id: "team-1",
    name: "Contas a pagar",
    code: "CAP",
    description: null,
    departmentId: "department-1",
    status: "active",
    ...overrides,
  }
}

function projectedPosition(
  overrides: Partial<ProjectedPosition> = {}
): ProjectedPosition {
  return {
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
  }
}
