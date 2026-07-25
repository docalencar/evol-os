import {
  ORGANIZATION_SNAPSHOT_SCHEMA_VERSION,
  type OrganizationSnapshot,
} from "../types"
import {
  mapDepartmentToSnapshot,
  mapEmployeeToSnapshot,
  mapPositionToSnapshot,
  mapTeamToSnapshot,
} from "../mappers"
import {
  createOrganizationReadService,
  type OrganizationPositionReadRow,
  type OrganizationReadModel,
  type OrganizationReadService,
  type OrganizationTeamReadRow,
} from "../services"

type OrganizationSnapshotBuilderDependencies = {
  readService?: OrganizationReadService
  now?: () => Date
}

function createIndexById<T extends { id: string }>(
  values: readonly T[]
) {
  return new Map(
    values.map((value) => [
      value.id,
      value,
    ])
  )
}

export function buildOrganizationSnapshot(
  organization: OrganizationReadModel,
  generatedAt: Date = new Date()
): OrganizationSnapshot {
  const teamsById = createIndexById<
    OrganizationTeamReadRow
  >(organization.teams)

  const positionsById = createIndexById<
    OrganizationPositionReadRow
  >(organization.positions)

  const departments = Object.freeze(
    organization.departments.map(
      mapDepartmentToSnapshot
    )
  )

  const teams = Object.freeze(
    organization.teams.map(
      mapTeamToSnapshot
    )
  )

  const positions = Object.freeze(
    organization.positions.map(
      mapPositionToSnapshot
    )
  )

  const employees = Object.freeze(
    organization.employees.map((employee) =>
      mapEmployeeToSnapshot(employee, {
        teamsById,
        positionsById,
      })
    )
  )

  return Object.freeze({
    schemaVersion:
      ORGANIZATION_SNAPSHOT_SCHEMA_VERSION,
    generatedAt: generatedAt.toISOString(),
    departments,
    teams,
    positions,
    employees,
  })
}

export async function createOrganizationSnapshotBuilder(
  dependencies: OrganizationSnapshotBuilderDependencies = {}
) {
  const readService =
    dependencies.readService ??
    (await createOrganizationReadService())

  const now =
    dependencies.now ??
    (() => new Date())

  return {
    async build(
      companyId: string
    ): Promise<OrganizationSnapshot> {
      const organization =
        await readService.read(companyId)

      return buildOrganizationSnapshot(
        organization,
        now()
      )
    },
  }
}

export type OrganizationSnapshotBuilder =
  Awaited<
    ReturnType<
      typeof createOrganizationSnapshotBuilder
    >
  >
