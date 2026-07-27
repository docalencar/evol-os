import type {
  ProjectionApplicationRepository,
} from "./projection-application-repository"

export interface ProjectionVersionAllocator {
  allocate(
    companyId: string,
    scenarioId: string
  ): Promise<number>
}

export class InMemoryProjectionVersionAllocator
  implements ProjectionVersionAllocator
{
  private readonly versions =
    new Map<string, number>()

  async allocate(
    companyId: string,
    scenarioId: string
  ): Promise<number> {
    const key = createVersionKey(
      companyId,
      scenarioId
    )

    const nextVersion =
      (this.versions.get(key) ?? 0) + 1

    this.versions.set(
      key,
      nextVersion
    )

    return nextVersion
  }
}

export class RepositoryProjectionVersionAllocator
  implements ProjectionVersionAllocator
{
  constructor(
    private readonly projectionRepository:
      ProjectionApplicationRepository
  ) {}

  async allocate(
    companyId: string,
    scenarioId: string
  ): Promise<number> {
    const latestProjection =
      await this.projectionRepository
        .findLatestByScenario(
          companyId,
          scenarioId
        )

    return latestProjection
      ? latestProjection.version + 1
      : 1
  }
}

function createVersionKey(
  companyId: string,
  scenarioId: string
): string {
  return `${companyId}:${scenarioId}`
}
