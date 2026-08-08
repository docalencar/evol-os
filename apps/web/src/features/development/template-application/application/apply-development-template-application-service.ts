import {
  resolveDevelopmentTemplateApplication,
  type DevelopmentTemplateResolutionIssue,
  type DevelopmentTemplateResolutionWarning,
} from "../resolver"
import type {
  TrustedTemplateApplicationPersistence,
  TrustedTemplateApplicationPersistenceResult,
} from "../trusted-persistence"
import type {
  DevelopmentTemplateApplicationIntent,
  DevelopmentTemplateApplicationResolutionRepository,
} from "./ports"

export type ApplyDevelopmentTemplateApplicationResult =
  | TrustedTemplateApplicationPersistenceResult
  | Readonly<{
      status: "resolution_failure"
      errors: readonly DevelopmentTemplateResolutionIssue[]
      warnings: readonly DevelopmentTemplateResolutionWarning[]
    }>

export class ApplyDevelopmentTemplateApplicationService {
  constructor(
    private readonly resolutions: DevelopmentTemplateApplicationResolutionRepository,
    private readonly persistence: TrustedTemplateApplicationPersistence,
  ) {}

  async execute(
    intent: DevelopmentTemplateApplicationIntent,
  ): Promise<ApplyDevelopmentTemplateApplicationResult> {
    const data = await this.resolutions.load(intent)
    const result = resolveDevelopmentTemplateApplication({
      ...data,
      identity: intent.identity,
      intent: intent.intent,
    })

    if (!result.ok) {
      return {
        status: "resolution_failure",
        errors: result.errors,
        warnings: result.warnings,
      }
    }

    return this.persistence.persist(result.resolution)
  }
}
