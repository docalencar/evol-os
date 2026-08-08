"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { failureResult, successResult } from "@/lib/actions"

import {
  applyDevelopmentTemplateV2,
  createConsoleDevelopmentTemplateApplicationObserver,
  developmentTemplateApplicationMessage,
} from "../application"

const schema = z.object({
  applicationId: z.string().uuid(), idempotencyKey: z.string().uuid(), correlationId: z.string().uuid(),
  templateVersionId: z.string().uuid(), effectiveAt: z.string().datetime(),
  employeeId: z.string().uuid(), ownerId: z.string().uuid().optional(),
  priority: z.enum(["low", "medium", "high"]), startDate: z.string().min(1), dueDate: z.string().optional(),
})

export async function confirmDevelopmentTemplateApplicationAction(values: z.infer<typeof schema>) {
  const parsed = schema.safeParse(values)
  if (!parsed.success) return failureResult("A confirmação está incompleta. Verifique o template novamente.")
  const observer = createConsoleDevelopmentTemplateApplicationObserver()

  try {
    const result = await applyDevelopmentTemplateV2(parsed.data)
    const base = {
      operation: "apply" as const,
      applicationId: parsed.data.applicationId,
      correlationId: parsed.data.correlationId,
      idempotencyKey: parsed.data.idempotencyKey,
    }
    if (result.status === "created" || result.status === "idempotent_retry") {
      observer.record({ ...base, outcome: result.status === "created" ? "created" : "idempotent_replay" })
      revalidatePath("/app/development")
      revalidatePath(`/app/development/plans/${result.planId}`)
      return successResult(
        result.status === "idempotent_retry"
          ? "Aplicação já concluída; o mesmo plano foi recuperado."
          : "Plano de desenvolvimento criado com sucesso.",
        { planId: result.planId },
      )
    }

    const code = "code" in result
      ? result.code
      : result.status === "resolution_failure"
        ? result.errors[0]?.code
        : undefined
    const outcome = result.status === "idempotency_conflict"
      ? "conflict"
      : result.status === "authorization_failure"
        ? "authorization_failure"
        : result.status === "integrity_failure" || result.status === "resolution_failure" || result.status === "known_failure"
          ? "integrity_failure"
          : "persistence_failure"
    observer.record({ ...base, outcome, failureCode: code })
    return failureResult(developmentTemplateApplicationMessage(code ?? outcome))
  } catch {
    observer.record({
      operation: "apply", applicationId: parsed.data.applicationId,
      correlationId: parsed.data.correlationId, idempotencyKey: parsed.data.idempotencyKey,
      outcome: "persistence_failure", failureCode: "DEVELOPMENT_TEMPLATE_APPLICATION_UNEXPECTED_FAILURE",
    })
    return failureResult("Não foi possível concluir a aplicação. Tente novamente.")
  }
}
