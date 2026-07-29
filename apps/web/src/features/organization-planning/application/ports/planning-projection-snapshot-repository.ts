import type { ProjectionSnapshot } from "../../projection"

export interface PlanningProjectionSnapshotRepository {
  findProjectionById(
    companyId: string,
    snapshotId: string
  ): Promise<ProjectionSnapshot | null>
}
