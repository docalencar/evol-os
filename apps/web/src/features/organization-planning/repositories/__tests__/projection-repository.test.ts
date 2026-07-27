import assert from "node:assert/strict"
import test from "node:test"

import {
  createEmptyProjectedOrganization,
  type ProjectionContract,
} from "../../projection"
import {
  createProjectionRepositoryFromDatabase,
} from "../projection-repository"

type DatabaseParameter =
  Parameters<
    typeof createProjectionRepositoryFromDatabase
  >[0]

type DatabaseResult = Readonly<{
  data: unknown
  error:
    | Readonly<{
        message: string
      }>
    | null
}>

type QueryOperation =
  | Readonly<{
      type: "select"
      columns: string
    }>
  | Readonly<{
      type: "eq"
      column: string
      value: unknown
    }>
  | Readonly<{
      type: "order"
      column: string
      options: Readonly<{
        ascending: boolean
      }>
    }>
  | Readonly<{
      type: "limit"
      count: number
    }>
  | Readonly<{
      type: "maybeSingle"
    }>
  | Readonly<{
      type: "insert"
      payload: unknown
    }>

type QueryExecution =
  Readonly<{
    table: string
    operations:
      readonly QueryOperation[]
  }>

class FakeQueryBuilder {
  private readonly operations:
    QueryOperation[] = []

  constructor(
    private readonly database:
      FakeProjectionDatabase,
    private readonly table:
      string
  ) {}

  select(columns: string) {
    this.operations.push({
      type: "select",
      columns,
    })

    return this
  }

  eq(
    column: string,
    value: unknown
  ) {
    this.operations.push({
      type: "eq",
      column,
      value,
    })

    return this
  }

  order(
    column: string,
    options: Readonly<{
      ascending: boolean
    }>
  ) {
    this.operations.push({
      type: "order",
      column,
      options,
    })

    return this
  }

  limit(count: number) {
    this.operations.push({
      type: "limit",
      count,
    })

    return this
  }

  async maybeSingle():
  Promise<DatabaseResult> {
    this.operations.push({
      type: "maybeSingle",
    })

    this.database.executions.push({
      table: this.table,
      operations:
        Object.freeze([
          ...this.operations,
        ]),
    })

    return this.database.nextSelectResult
  }

  async insert(
    payload: unknown
  ): Promise<DatabaseResult> {
    this.operations.push({
      type: "insert",
      payload,
    })

    this.database.executions.push({
      table: this.table,
      operations:
        Object.freeze([
          ...this.operations,
        ]),
    })

    return this.database.nextInsertResult
  }
}

class FakeProjectionDatabase {
  readonly executions:
    QueryExecution[] = []

  nextSelectResult:
    DatabaseResult = {
      data: null,
      error: null,
    }

  nextInsertResult:
    DatabaseResult = {
      data: null,
      error: null,
    }

  from(table: string) {
    return new FakeQueryBuilder(
      this,
      table
    )
  }
}

const companyId =
  "company-1"

const workspaceId =
  "workspace-1"

const scenarioId =
  "scenario-1"

const snapshotId =
  "snapshot-1"

const projectionId =
  "projection-1"

const generatedAt =
  new Date(
    "2026-07-20T14:30:00.000Z"
  )

const createdAt =
  new Date(
    "2026-07-20T14:31:00.000Z"
  )

const updatedAt =
  new Date(
    "2026-07-20T14:32:00.000Z"
  )

const organization =
  createEmptyProjectedOrganization()

const projection:
  ProjectionContract =
  Object.freeze({
    id: projectionId,
    companyId,
    workspaceId,
    scenarioId,
    sourceSnapshotId:
      snapshotId,
    version: 4,
    status: "completed",
    organization,
    metrics:
      organization.metrics,
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
    manifest:
      Object.freeze({
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
        generatedAt,
      }),
    createdAt,
    updatedAt,
  })

function createProjectionRow(
  overrides:
    Record<string, unknown> = {}
) {
  return {
    id: projectionId,
    company_id:
      companyId,
    workspace_id:
      workspaceId,
    scenario_id:
      scenarioId,
    source_snapshot_id:
      snapshotId,
    version: 4,
    status: "completed",
    organization: {
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
    },
    metrics: {
      headcount: 0,
      vacancies: 0,
      salaryMass: 0,
      departments: 0,
      positions: 0,
    },
    warnings: [
      {
        code:
          "projection.warning",
        message:
          "Aviso de teste.",
        changeSetId:
          "change-set-1",
      },
    ],
    errors: [],
    manifest: {
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
        generatedAt.toISOString(),
    },
    created_at:
      createdAt.toISOString(),
    updated_at:
      updatedAt.toISOString(),
    ...overrides,
  }
}

function createRepository() {
  const database =
    new FakeProjectionDatabase()

  const repository =
    createProjectionRepositoryFromDatabase(
      database as unknown as
        DatabaseParameter
    )

  return {
    database,
    repository,
  }
}

function findOperation<
  TType extends
    QueryOperation["type"],
>(
  execution: QueryExecution,
  type: TType
) {
  return execution.operations.find(
    (
      operation
    ): operation is Extract<
      QueryOperation,
      {
        type: TType
      }
    > =>
      operation.type === type
  )
}

test(
  "ProjectionRepository findById consulta a projeção pela empresa e pelo identificador",
  async () => {
    const {
      database,
      repository,
    } = createRepository()

    database.nextSelectResult = {
      data:
        createProjectionRow(),
      error: null,
    }

    const result =
      await repository.findById(
        companyId,
        projectionId
      )

    assert.notEqual(
      result,
      null
    )

    assert.equal(
      database.executions.length,
      1
    )

    const execution =
      database.executions[0]

    assert.equal(
      execution.table,
      "organization_planning_projections"
    )

    assert.deepEqual(
      execution.operations.filter(
        operation =>
          operation.type ===
          "eq"
      ),
      [
        {
          type: "eq",
          column:
            "company_id",
          value:
            companyId,
        },
        {
          type: "eq",
          column: "id",
          value:
            projectionId,
        },
      ]
    )

    assert.deepEqual(
      execution.operations.at(-1),
      {
        type:
          "maybeSingle",
      }
    )
  }
)

test(
  "ProjectionRepository findById restaura o contrato persistido",
  async () => {
    const {
      database,
      repository,
    } = createRepository()

    database.nextSelectResult = {
      data:
        createProjectionRow(),
      error: null,
    }

    const result =
      await repository.findById(
        companyId,
        projectionId
      )

    assert.notEqual(
      result,
      null
    )

    assert.equal(
      result?.id,
      projectionId
    )

    assert.equal(
      result?.companyId,
      companyId
    )

    assert.equal(
      result?.workspaceId,
      workspaceId
    )

    assert.equal(
      result?.scenarioId,
      scenarioId
    )

    assert.equal(
      result?.sourceSnapshotId,
      snapshotId
    )

    assert.equal(
      result?.version,
      4
    )

    assert.equal(
      result?.status,
      "completed"
    )

    assert.deepEqual(
      result?.createdAt,
      createdAt
    )

    assert.deepEqual(
      result?.updatedAt,
      updatedAt
    )

    assert.deepEqual(
      result?.manifest.generatedAt,
      generatedAt
    )

    assert.deepEqual(
      result?.warnings,
      projection.warnings
    )

    assert.deepEqual(
      result?.errors,
      projection.errors
    )
  }
)

test(
  "ProjectionRepository findById retorna null quando a projeção não existe",
  async () => {
    const {
      repository,
    } = createRepository()

    const result =
      await repository.findById(
        companyId,
        projectionId
      )

    assert.equal(
      result,
      null
    )
  }
)

test(
  "ProjectionRepository findLatestByScenario consulta a versão mais recente",
  async () => {
    const {
      database,
      repository,
    } = createRepository()

    database.nextSelectResult = {
      data:
        createProjectionRow(),
      error: null,
    }

    const result =
      await repository
        .findLatestByScenario(
          companyId,
          scenarioId
        )

    assert.notEqual(
      result,
      null
    )

    assert.equal(
      database.executions.length,
      1
    )

    const execution =
      database.executions[0]

    assert.deepEqual(
      execution.operations.filter(
        operation =>
          operation.type ===
          "eq"
      ),
      [
        {
          type: "eq",
          column:
            "company_id",
          value:
            companyId,
        },
        {
          type: "eq",
          column:
            "scenario_id",
          value:
            scenarioId,
        },
      ]
    )

    assert.deepEqual(
      findOperation(
        execution,
        "order"
      ),
      {
        type: "order",
        column: "version",
        options: {
          ascending: false,
        },
      }
    )

    assert.deepEqual(
      findOperation(
        execution,
        "limit"
      ),
      {
        type: "limit",
        count: 1,
      }
    )
  }
)

test(
  "ProjectionRepository create serializa e insere o contrato",
  async () => {
    const {
      database,
      repository,
    } = createRepository()

    await repository.create(
      projection
    )

    assert.equal(
      database.executions.length,
      1
    )

    const execution =
      database.executions[0]

    assert.equal(
      execution.table,
      "organization_planning_projections"
    )

    const insertOperation =
      findOperation(
        execution,
        "insert"
      )

    assert.notEqual(
      insertOperation,
      undefined
    )

    assert.deepEqual(
      insertOperation?.payload,
      {
        id: projectionId,
        company_id:
          companyId,
        workspace_id:
          workspaceId,
        scenario_id:
          scenarioId,
        source_snapshot_id:
          snapshotId,
        version: 4,
        status:
          "completed",
        organization,
        metrics:
          organization.metrics,
        warnings:
          projection.warnings,
        errors:
          projection.errors,
        manifest: {
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
            generatedAt.toISOString(),
        },
        created_at:
          createdAt.toISOString(),
        updated_at:
          updatedAt.toISOString(),
      }
    )
  }
)

test(
  "ProjectionRepository propaga erro de leitura do banco",
  async () => {
    const {
      database,
      repository,
    } = createRepository()

    database.nextSelectResult = {
      data: null,
      error: {
        message:
          "Falha ao consultar projeção.",
      },
    }

    await assert.rejects(
      repository.findById(
        companyId,
        projectionId
      ),
      {
        message:
          "Falha ao consultar projeção.",
      }
    )
  }
)

test(
  "ProjectionRepository propaga erro de inserção do banco",
  async () => {
    const {
      database,
      repository,
    } = createRepository()

    database.nextInsertResult = {
      data: null,
      error: {
        message:
          "Falha ao criar projeção.",
      },
    }

    await assert.rejects(
      repository.create(
        projection
      ),
      {
        message:
          "Falha ao criar projeção.",
      }
    )
  }
)

test(
  "ProjectionRepository rejeita status persistido inválido",
  async () => {
    const {
      database,
      repository,
    } = createRepository()

    database.nextSelectResult = {
      data:
        createProjectionRow({
          status:
            "invalid-status",
        }),
      error: null,
    }

    await assert.rejects(
      repository.findById(
        companyId,
        projectionId
      ),
      {
        message:
          "O status invalid-status da projeção é inválido.",
      }
    )
  }
)

test(
  "ProjectionRepository rejeita manifesto persistido inválido",
  async () => {
    const {
      database,
      repository,
    } = createRepository()

    database.nextSelectResult = {
      data:
        createProjectionRow({
          manifest: {
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
              "data-invalida",
          },
        }),
      error: null,
    }

    await assert.rejects(
      repository.findById(
        companyId,
        projectionId
      ),
      {
        message:
          "O campo manifest.generatedAt da projeção é inválido.",
      }
    )
  }
)

test(
  "ProjectionRepository restaura contratos imutáveis",
  async () => {
    const {
      database,
      repository,
    } = createRepository()

    database.nextSelectResult = {
      data:
        createProjectionRow(),
      error: null,
    }

    const result =
      await repository.findById(
        companyId,
        projectionId
      )

    assert.notEqual(
      result,
      null
    )

    assert.equal(
      Object.isFrozen(
        result
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result?.organization
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result?.metrics
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result?.manifest
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result?.warnings
      ),
      true
    )

    assert.equal(
      Object.isFrozen(
        result?.errors
      ),
      true
    )
  }
)
