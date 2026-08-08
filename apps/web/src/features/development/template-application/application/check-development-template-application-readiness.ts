import {
  resolveDevelopmentTemplateApplication,
  type DevelopmentTemplateResolutionIssue,
  type DevelopmentTemplateResolutionWarning,
} from "../resolver"
import type {
  DevelopmentTemplateApplicationIntent,
  DevelopmentTemplateApplicationResolutionRepository,
} from "./ports"

export type DevelopmentTemplateApplicationReadinessResult =
  | Readonly<{
      ready: true
      fingerprint: string
      warnings: readonly DevelopmentTemplateResolutionWarning[]
    }>
  | Readonly<{
      ready: false
      errors: readonly DevelopmentTemplateResolutionIssue[]
      warnings: readonly DevelopmentTemplateResolutionWarning[]
    }>

export class CheckDevelopmentTemplateApplicationReadiness {
  constructor(
    private readonly resolutions: DevelopmentTemplateApplicationResolutionRepository,
  ) {}

  async execute(
    intent: DevelopmentTemplateApplicationIntent,
  ): Promise<DevelopmentTemplateApplicationReadinessResult> {
    const data = await this.resolutions.load(intent)
    const result = resolveDevelopmentTemplateApplication({
      ...data,
      identity: intent.identity,
      intent: intent.intent,
    })

    return result.ok
      ? { ready: true, fingerprint: result.resolution.fingerprint, warnings: result.resolution.warnings }
      : { ready: false, errors: result.errors, warnings: result.warnings }
  }
}
