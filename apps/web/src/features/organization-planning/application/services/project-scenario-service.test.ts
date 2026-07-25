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
import type {
  OrganizationSnapshot,
} from "../../snapshot"
import {
  ORGANIZATION_SNAPSHOT_SCHEMA_VERSION,
} from "../../snapshot"
import {
  PlanningApplicationError,
} from "../handlers/planning-handler-support"
import type {
  PlanningChangeSetApplicationRepository,
  ScenarioApplicationRepository,
  SnapshotApplicationRepository,
} from "../ports"
import {
  ProjectScenarioService,
} from "./project-scenario-service"

const companyId = "company-1"
const workspaceId = "workspace-1"
const scenarioId = "scenario-1"
const snapshotId = "snapshot-1"

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

class InMemoryScenarioRepository
  implements ScenarioApplicationRepository
{
  constructor(
    private readonly storedScenario:
      PlanningScenario | null
  ) {}

  async findById(
    requestedCompanyId: string,
    requestedScenarioId: string
  ) {
    if (
      requestedCompanyId !==
        companyId ||
      requestedScenarioId !==
        scenarioId
    ) {
      return null
    }

    return this.storedScenario
  }

  async create() {}

  async save() {}
}

class InMemorySnapshotRepository
  implements SnapshotApplicationRepository
{
  constructor(
    private readonly storedSnapshot:
      PublishedSnapshot | null,
    private readonly storedOrganization:
      OrganizationSnapshot | null
  ) {}

  async findById(
    requestedCompanyId: string,
    requestedSnapshotId: string
  ) {
    if (
      requestedCompanyId !==
        companyId ||
      requestedSnapshotId !==
        snapshotId
    ) {
      return null
    }

    return this.storedSnapshot
  }

  async findOrganizationById(
    requestedCompanyId: string,
    requestedSnapshotId: string
  ) {
    if (
      requestedCompanyId !==
        companyId ||
      requestedSnapshotId !==
        snapshotId
    ) {
      return null
    }

    return this.storedOrganization
  }

  async create() {}
}

class InMemoryPlanningChangeSetRepository
  implements PlanningChangeSetApplicationRepository
{
  readonly calls: Array<{
    companyId: string
    scenarioId: string
  }> = []

  constructor(
    private readonly storedChangeSets:
      readonly PlanningChangeSet[] = []
  ) {}

  async findByScenario(
    requestedCompanyId: string,
    requestedScenarioId: string
  ) {
    this.calls.push({
      companyId:
        requestedCompanyId,
      scenarioId:
        requestedScenarioId,
    })

    return this.storedChangeSets
  }
}

function createService(input?: {
  storedScenario?:
    PlanningScenario | null
  storedSnapshot?:
    PublishedSnapshot | null
  storedOrganization?:
    OrganizationSnapshot | null
  changeSets?:
    readonly PlanningChangeSet[]
}) {
  const changeSets =
    new InMemoryPlanningChangeSetRepository(
      input?.changeSets ?? []
    )

  const service =
    new ProjectScenarioService(
      new InMemoryScenarioRepository(
        input?.storedScenario ===
          undefined
          ? scenario
          : input.storedScenario
      ),
      new InMemorySnapshotRepository(
        input?.storedSnapshot ===
          undefined
          ? snapshot
          : input.storedSnapshot,
        input?.storedOrganization ===
          undefined
          ? organizationSnapshot
          : input.storedOrganization
      ),
      changeSets
    )

  return {
    service,
    changeSets,
  }
}

test(
  "ProjectScenarioService carrega o cenário, snapshot, organização e change sets",
  async () => {
    const {
      service,
      changeSets,
    } = createService()

    const result =
      await service.execute({
        companyId,
        scenarioId,
      })

    assert.equal(
      result.isValid,
      true
    )

    assert.deepEqual(
      result.metrics,
      {
        headcount: 0,
        vacancies: 0,
        salaryMass: 0,
        departments: 0,
        positions: 0,
      }
    )

    assert.deepEqual(
      changeSets.calls,
      [
        {
          companyId,
          scenarioId,
        },
      ]
    )

    assert.equal(
      Object.isFrozen(
        result.organization
      ),
      true
    )
  }
)

test(
  "ProjectScenarioService aplica os change sets do cenário sobre o snapshot-base",
  async () => {
    const departmentChangeSet:
      PlanningChangeSet =
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
      })

    const {
      service,
    } = createService({
      changeSets: [
        departmentChangeSet,
      ],
    })

    const result =
      await service.execute({
        companyId,
        scenarioId,
      })

    assert.equal(
      result.isValid,
      true
    )

    assert.deepEqual(
      result.organization.departments,
      [
        {
          id: "department-1",
          name: "Financeiro",
          code: "FIN",
          description: null,
          parentDepartmentId: null,
          status: "active",
        },
      ]
    )

    assert.equal(
      result.metrics.departments,
      1
    )
  }
)

test(
  "ProjectScenarioService rejeita cenário inexistente",
  async () => {
    const {
      service,
      changeSets,
    } = createService({
      storedScenario: null,
    })

    await assert.rejects(
      service.execute({
        companyId,
        scenarioId,
      }),
      (
        error: unknown
      ) => {
        assert.equal(
          error instanceof
            PlanningApplicationError,
          true
        )

        assert.equal(
          (
            error as
              PlanningApplicationError
          ).code,
          "not_found"
        )

        assert.equal(
          (
            error as Error
          ).message,
          "Cenário não encontrado."
        )

        return true
      }
    )

    assert.equal(
      changeSets.calls.length,
      0
    )
  }
)

test(
  "ProjectScenarioService rejeita snapshot-base inexistente",
  async () => {
    const {
      service,
      changeSets,
    } = createService({
      storedSnapshot: null,
    })

    await assert.rejects(
      service.execute({
        companyId,
        scenarioId,
      }),
      (
        error: unknown
      ) => {
        assert.equal(
          error instanceof
            PlanningApplicationError,
          true
        )

        assert.equal(
          (
            error as
              PlanningApplicationError
          ).code,
          "not_found"
        )

        assert.equal(
          (
            error as Error
          ).message,
          "Snapshot-base não encontrado."
        )

        return true
      }
    )

    assert.equal(
      changeSets.calls.length,
      0
    )
  }
)

test(
  "ProjectScenarioService rejeita snapshot-base sem conteúdo organizacional",
  async () => {
    const {
      service,
      changeSets,
    } = createService({
      storedOrganization: null,
    })

    await assert.rejects(
      service.execute({
        companyId,
        scenarioId,
      }),
      (
        error: unknown
      ) => {
        assert.equal(
          error instanceof
            PlanningApplicationError,
          true
        )

        assert.equal(
          (
            error as
              PlanningApplicationError
          ).code,
          "not_found"
        )

        assert.equal(
          (
            error as Error
          ).message,
          "Conteúdo organizacional do snapshot-base não encontrado."
        )

        return true
      }
    )

    assert.equal(
      changeSets.calls.length,
      0
    )
  }
)
