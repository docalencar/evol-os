import type {
  DevelopmentTemplateApplication,
  DevelopmentTemplateApplicationAttempt,
  DevelopmentTemplateApplicationLineage,
  DevelopmentTemplateApplicationSnapshot,
  DevelopmentTemplateVersion,
  DevelopmentTemplateVersionAction,
  DevelopmentTemplateVersionGoal,
} from "./types"

export interface DevelopmentTemplateVersionRepository {
  findPublishedById(id: string): Promise<DevelopmentTemplateVersion | null>
  listGoals(
    templateVersionId: string,
  ): Promise<readonly DevelopmentTemplateVersionGoal[]>
  listActions(
    templateVersionGoalIds: readonly string[],
  ): Promise<readonly DevelopmentTemplateVersionAction[]>
}

export interface DevelopmentTemplateApplicationRepository {
  findById(
    companyId: string,
    applicationId: string,
  ): Promise<DevelopmentTemplateApplication | null>
  findByIdempotencyKey(
    companyId: string,
    idempotencyKey: string,
  ): Promise<DevelopmentTemplateApplication | null>
  listAttempts(
    companyId: string,
    applicationId: string,
  ): Promise<readonly DevelopmentTemplateApplicationAttempt[]>
}

export interface DevelopmentTemplateApplicationHistoryRepository {
  findSnapshot(
    companyId: string,
    applicationId: string,
  ): Promise<DevelopmentTemplateApplicationSnapshot | null>
  findLineage(
    companyId: string,
    applicationId: string,
  ): Promise<DevelopmentTemplateApplicationLineage | null>
}
