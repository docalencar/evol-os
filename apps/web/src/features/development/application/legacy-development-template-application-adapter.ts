import type {
  ApplyDevelopmentTemplateV2Input,
  ApplyDevelopmentTemplateV2Result,
} from "./apply-development-template-v2"
import type { ApplyDevelopmentTemplateInput } from "./apply-development-template"

export type LegacyDevelopmentTemplateApplicationAdapterDependencies = Readonly<{
  findPublishedTemplateVersionId(templateId: string): Promise<string>
  apply(input: ApplyDevelopmentTemplateV2Input): Promise<ApplyDevelopmentTemplateV2Result>
  createId(): string
  now(): Date
}>

export function createLegacyDevelopmentTemplateApplicationAdapter(
  dependencies: LegacyDevelopmentTemplateApplicationAdapterDependencies,
) {
  return async function applyLegacyDevelopmentTemplate(
    input: ApplyDevelopmentTemplateInput,
  ): Promise<Readonly<{ planId: string }>> {
    const templateVersionId = await dependencies.findPublishedTemplateVersionId(
      input.templateId,
    )
    const applicationId = dependencies.createId()
    const idempotencyKey = dependencies.createId()
    const effectiveAt = dependencies.now().toISOString()
    const result = await dependencies.apply({
      applicationId,
      idempotencyKey,
      correlationId: dependencies.createId(),
      templateVersionId,
      employeeId: input.employeeId,
      ownerId: input.ownerId,
      priority: input.priority,
      startDate: input.startDate ?? effectiveAt.slice(0, 10),
      dueDate: input.dueDate,
      effectiveAt,
    })

    if (result.status === "created" || result.status === "idempotent_retry") {
      return { planId: result.planId }
    }

    if ("code" in result) throw new Error(result.code)
    if (result.status === "resolution_failure") {
      throw new Error(result.errors[0]?.code ?? "DEVELOPMENT_TEMPLATE_RESOLUTION_FAILED")
    }
    throw new Error("DEVELOPMENT_TEMPLATE_APPLICATION_FAILED")
  }
}
