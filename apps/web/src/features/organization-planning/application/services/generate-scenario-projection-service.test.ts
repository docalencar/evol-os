import assert from "node:assert/strict"
import test from "node:test"

import type {
  PlanningChangeSet,
} from "../../change-sets"
import {
  PlanningScenario,
} from "../../domain/planning-scenario"
import {
  PublishedSnapshot,
} from "../../domain/published-snapshot"
import {
  createEmptyProjectedOrganization,
  type ProjectionContract,
  type ProjectionResult,
} from "../../projection"
import {
  ORGANIZATION_SNAPSHOT_SCHEMA_VERSION,
  type OrganizationSnapshot,
} from "../../snapshot"
import type {
  ProjectionApplicationRepository,
  ProjectionVersionAllocator,
} from "../ports"
import {
  GenerateScenarioProjectionService,
} from "./generate-scenario-projection-service"
import type {
  ProjectScenarioExecution,
  ProjectScenarioService,
} from "./project-scenario-service"

const companyId = "company-1"
const workspaceId = "workspace-1"
const scenarioId = "scenario-1"
const snapshotId = "snapshot-1"
const projectionId = "projection-1"

const occurredAt =
  new Date(
    "2026-07-20T14:30:00.000Z"
  )

const scenario =
  PlanningScenario.restore({
    id: scenarioId,
    companyId,
    workspaceId,
    baseSnapshotId: snapshotId,
    name: "Expansão 2027",
    description:
      "Cenário de expansão organizacional.",
    status: "draft",
    version: 1,
    createdAt:
      new Date(
        "2026-07-01T10:00:00.000Z"
      ),
    updatedAt:
      new Date(
        "2026-07-01T10:00:00.000Z"
      ),
  })

const snapshot =
  PublishedSnapshot.restore({
    id: snapshotId,
    companyId,
    workspaceId,
    sourceScenarioId: null,
    version: 1,
    publishedAt:
      new Date(
        "2026-06-30T10:00:00.000Z"
      ),
  })

const organizationSnapshot:
  OrganizationSnapshot =
  Object.freeze({
    schemaVersion:
      ORGANIZATION_SNAPSHOT_SCHEMA_VERSION,
    generatedAt:
      "2026-06-30T10:00:00.000Z",
    departments:
      Object.freeze([]),
    teams:
      Object.freeze([]),
    positions:
      Object.freeze([]),
    employees:
      Object.freeze([]),
  })

const changeSets:
  readonly PlanningChangeSet[] =
  Object.freeze([
    Object.freeze({
      id: "change-set-1",
      companyId,
      scenarioId,
      changeType:
        "department.create",
      payload:
        Object.freeze({
          departmentId:
            "department-1",
          name:
            "Financeiro",
          code:
            "FIN",
          description:
            null,
          parentDepartmentId:
            null,
        }),
      version: 1,
      createdAt:
        "2026-07-02T10:00:00.000Z",
      updatedAt:
        "2026-07-02T10:00:00.000Z",
    }),
    Object.freeze({
      id: "change-set-2",
      companyId,
      scenarioId,
      changeType:
        "department.create",
      payload:
        Object.freeze({
          departmentId:
            "department-2",
          name:
            "Operações",
          code:
            "OPS",
          description:
            null,
          parentDepartmentId:
            null,
        }),
      version: 1,
      createdAt:
        "2026-07-02T11:00:00.000Z",
      updatedAt:
        "2026-07-02T11:00:00.000Z",
    }),
  ])

const organization =
  createEmptyProjectedOrganization()

const projectionResult:
  ProjectionResult =
  Object.freeze({
    organization,
    warnings:
      Object.freeze([
        Object.freeze({
          code:
            "projection.warning",
          message:
            "Aviso de teste.",
          changeSetId:
            "change-set-1",
        }),
      ]),
    errors:
      Object.freeze([]),
    metrics:
      organization.metrics,
    isValid: true,
  })

const execution:
  ProjectScenarioExecution =
  Object.freeze({
    scenario,
    snapshot,
    organizationSnapshot,
    changeSets,
    projection:
      projectionResult,
  })

class ProjectScenarioServiceFake {
  readonly calls: Array<{
    companyId: string
    scenarioId: string
  }> = []

  constructor(
    private readonly storedExecution:
      ProjectScenarioExecution
  ) {}

  async executeWithContext(input: {
    companyId: string
    scenarioId: string
  }) {
    this.calls.push({
      companyId:
        input.companyId,
      scenarioId:
        input.scenarioId,
    })

    return this.storedExecution
  }
}

class ProjectionRepositoryFake
  implements ProjectionApplicationRepository
{
  readonly created:
    ProjectionContract[] = []

  async findById() {
    return null
  }

  async findLatestByScenario() {
    return null
  }

  async create(
    projection:
      ProjectionContract
  ) {
    this.created.push(
      projection
    )
  }
}

class ProjectionVersionAllocatorFake
  implements ProjectionVersionAllocator
{
  readonly calls: Array<{
    companyId: string
    scenarioId: string
  }> = []

  constructor(
    private readonly version:
      number
  ) {}

  async allocate(
    requestedCompanyId: string,
    requestedScenarioId: string
  ) {
    this.calls.push({
      companyId:
        requestedCompanyId,
      scenarioId:
        requestedScenarioId,
    })

    return this.version
  }
}

function createService(input?: {
  measuredTimes?:
    readonly number[]
  version?: number
}) {
  const projectScenarioService =
    new ProjectScenarioServiceFake(
      execution
    )

  const projections =
    new ProjectionRepositoryFake()

  const versionAllocator =
    new ProjectionVersionAllocatorFake(
      input?.version ?? 4
    )

  const measuredTimes = [
    ...(input?.measuredTimes ??
      [100, 135.5]),
  ]

  const service =
    new GenerateScenarioProjectionService(
      projectScenarioService as unknown as
        ProjectScenarioService,
      projections,
      versionAllocator,
      () => projectionId,
      () =>
        new Date(
          occurredAt.getTime()
        ),
      () => {
        const measuredTime =
          measuredTimes.shift()

        assert.notEqual(
          measuredTime,
          undefined
        )

        return measuredTime as number
      },
      "engine-test-2.0.0",
      "schema-test-3.0.0"
    )

  return {
    service,
    projectScenarioService,
    projections,
    versionAllocator,
  }
}

test(
  "GenerateScenarioProjectionService gera e persiste uma nova projeção",
  async () => {
    const {
      service,
      projectScenarioService,
      projections,
      versionAllocator,
    } = createService()

    const result =
      await service.execute({
        companyId,
        scenarioId,
      })

    assert.deepEqual(
      projectScenarioService.calls,
      [
        {
          companyId,
          scenarioId,
        },
      ]
    )

    assert.deepEqual(
      versionAllocator.calls,
      [
        {
          companyId,
          scenarioId,
        },
      ]
    )

    assert.equal(
      projections.created.length,
      1
    )

    assert.equal(
      projections.created[0],
      result
    )
  }
)

test(
  "GenerateScenarioProjectionService cria o contrato com os dados da execução",
  async () => {
    const {
      service,
    } = createService({
      version: 4,
    })

    const result =
      await service.execute({
        companyId,
        scenarioId,
      })

    assert.equal(
      result.id,
      projectionId
    )

    assert.equal(
      result.companyId,
      companyId
    )

    assert.equal(
      result.workspaceId,
      workspaceId
    )

    assert.equal(
      result.scenarioId,
      scenarioId
    )

    assert.equal(
      result.sourceSnapshotId,
      snapshotId
    )

    assert.equal(
      result.version,
      4
    )

    assert.equal(
      result.status,
      "completed"
    )

    assert.equal(
      result.organization,
      projectionResult.organization
    )

    assert.equal(
      result.metrics,
      projectionResult.metrics
    )

    assert.deepEqual(
      result.warnings,
      projectionResult.warnings
    )

    assert.deepEqual(
      result.errors,
      projectionResult.errors
    )
  }
)

test(
  "GenerateScenarioProjectionService registra o manifesto da geração",
  async () => {
    const {
      service,
    } = createService({
      measuredTimes:
        [100, 135.5],
      version: 4,
    })

    const result =
      await service.execute({
        companyId,
        scenarioId,
      })

    assert.deepEqual(
      result.manifest,
      {
        projectionVersion: 4,
        engineVersion:
          "engine-test-2.0.0",
        schemaVersion:
          "schema-test-3.0.0",
        changeSetCount: 2,
        executedChangeSets: 2,
        warningCount: 1,
        errorCount: 0,
        durationMs: 35.5,
        generatedAt:
          new Date(
            "2026-07-20T14:30:00.000Z"
          ),
      }
    )

    assert.deepEqual(
      result.createdAt,
      occurredAt
    )

    assert.deepEqual(
      result.updatedAt,
      occurredAt
    )
  }
)

test(
  "GenerateScenarioProjectionService limita duração negativa a zero",
  async () => {
    const {
      service,
    } = createService({
      measuredTimes:
        [200, 150],
    })

    const result =
      await service.execute({
        companyId,
        scenarioId,
      })

    assert.equal(
      result.manifest.durationMs,
      0
    )
  }
)

test(
  "GenerateScenarioProjectionService retorna um contrato imutável",
  async () => {
    const {
      service,
    } = createService()

    const result =
      await service.execute({
        companyId,
        scenarioId,
      })

    assert.equal(
      Object.isFrozen(result),
      true
    )

    assert.equal(
      Object.isFrozen(
        result.manifest
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result.warnings
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result.errors
      ),
      true
    )
  }
)
