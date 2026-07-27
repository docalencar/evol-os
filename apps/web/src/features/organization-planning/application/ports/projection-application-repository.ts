import type {
  ProjectionContract,
} from "../../projection/contracts/projection-persistence-contract"

export interface ProjectionApplicationRepository {
  findById(
    companyId: string,
    projectionId: string
  ): Promise<ProjectionContract | null>

  findLatestByScenario(
    companyId: string,
    scenarioId: string
  ): Promise<ProjectionContract | null>

  create(
    projection: ProjectionContract
  ): Promise<void>
}
