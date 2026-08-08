"use server"

import { z } from "zod"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import {
  developmentTemplateApplicationMessage,
  getPublishedDevelopmentTemplateVersionId,
} from "../application"
import { createServerDevelopmentTemplateReadiness } from "../template-application/server"

const schema = z.object({
  applicationId: z.string().uuid(), idempotencyKey: z.string().uuid(), correlationId: z.string().uuid(),
  templateId: z.string().uuid(), employeeId: z.string().uuid(), ownerId: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high"]), startDate: z.string().min(1), dueDate: z.string().optional(),
  effectiveAt: z.string().datetime(),
})

export async function checkDevelopmentTemplateApplicationReadinessAction(values: z.infer<typeof schema>) {
  const parsed = schema.safeParse(values)
  if (!parsed.success) return { ready: false as const, message: "Dados inválidos para verificar a aplicação." }

  try {
    const [{ companyId, user }, templateVersionId, readiness] = await Promise.all([
      getCurrentCompanyContext(),
      getPublishedDevelopmentTemplateVersionId(parsed.data.templateId),
      createServerDevelopmentTemplateReadiness(),
    ])
    const result = await readiness.execute({
      identity: {
        applicationId: parsed.data.applicationId, companyId, actorUserId: user.id,
        technicalPrincipal: "service_role", idempotencyKey: parsed.data.idempotencyKey,
        correlationId: parsed.data.correlationId, effectiveAt: parsed.data.effectiveAt,
      },
      intent: {
        employeeId: parsed.data.employeeId, ownerId: parsed.data.ownerId ?? null,
        priority: parsed.data.priority, startDate: parsed.data.startDate, dueDate: parsed.data.dueDate ?? null,
      },
      templateVersionId,
    })
    if (!result.ready) {
      const code = result.errors[0]?.code ?? "DEVELOPMENT_TEMPLATE_READINESS_FAILED"
      return { ready: false as const, message: developmentTemplateApplicationMessage(code), code }
    }
    return { ready: true as const, message: "Template pronto para confirmação.", templateVersionId, fingerprint: result.fingerprint }
  } catch {
    return { ready: false as const, message: "Não foi possível verificar este template agora." }
  }
}
