import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import {
  createServerDevelopmentTemplateApplication,
  type ApplyDevelopmentTemplateApplicationResult,
} from "../template-application/server"

export type ApplyDevelopmentTemplateV2Input = Readonly<{
  applicationId: string
  idempotencyKey: string
  correlationId: string
  templateVersionId: string
  employeeId: string
  ownerId?: string
  priority: "low" | "medium" | "high"
  startDate: string
  dueDate?: string
  effectiveAt: string
}>

export type ApplyDevelopmentTemplateV2Result =
  ApplyDevelopmentTemplateApplicationResult

export async function applyDevelopmentTemplateV2(
  input: ApplyDevelopmentTemplateV2Input,
): Promise<ApplyDevelopmentTemplateV2Result> {
  const { companyId, user } = await getCurrentCompanyContext()
  const application = await createServerDevelopmentTemplateApplication()

  return application.execute({
    identity: {
      applicationId: input.applicationId,
      companyId,
      actorUserId: user.id,
      technicalPrincipal: "service_role",
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
      effectiveAt: input.effectiveAt,
    },
    intent: {
      employeeId: input.employeeId,
      ownerId: input.ownerId ?? null,
      priority: input.priority,
      startDate: input.startDate,
      dueDate: input.dueDate ?? null,
    },
    templateVersionId: input.templateVersionId,
  })
}
