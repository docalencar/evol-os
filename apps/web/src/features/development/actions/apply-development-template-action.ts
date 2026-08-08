"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  failureResult,
  successResult,
} from "@/lib/actions"

import {
  applyDevelopmentTemplate,
  applyDevelopmentTemplateV2,
  developmentTemplateApplicationMessage,
} from "../application"

const applyDevelopmentTemplateSchema =
  z.object({
    employeeId: z
      .string()
      .uuid(
        "Selecione um colaborador."
      ),

    templateId: z
      .string()
      .uuid(
        "Template inválido."
      ),

    ownerId: z
      .string()
      .uuid(
        "Responsável inválido."
      )
      .optional()
      .or(z.literal("")),

    priority: z.enum([
      "low",
      "medium",
      "high",
    ]),

    startDate: z
      .string()
      .optional(),

    dueDate: z
      .string()
      .optional(),

    applicationId: z.string().uuid().optional(),
    idempotencyKey: z.string().uuid().optional(),
    correlationId: z.string().uuid().optional(),
    templateVersionId: z.string().uuid().optional(),
    effectiveAt: z.string().datetime().optional(),
  })

type ApplyDevelopmentTemplateInput =
  z.infer<
    typeof applyDevelopmentTemplateSchema
  >

type ApplyDevelopmentTemplateResult = {
  planId: string
}

function getErrorMessage(
  error: unknown
) {
  if (error instanceof Error) {
    return error.message
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message
  }

  return "Não foi possível criar o plano de desenvolvimento."
}

export async function applyDevelopmentTemplateAction(
  values: ApplyDevelopmentTemplateInput
) {
  const parsed =
    applyDevelopmentTemplateSchema.safeParse(
      values
    )

  if (!parsed.success) {
    return failureResult(
      parsed.error.issues[0]?.message ??
        "Dados inválidos."
    )
  }

  try {
    const usesV2 = parsed.data.applicationId && parsed.data.idempotencyKey &&
      parsed.data.correlationId && parsed.data.templateVersionId && parsed.data.effectiveAt
    const hasV2Identity = parsed.data.applicationId || parsed.data.idempotencyKey ||
      parsed.data.correlationId || parsed.data.templateVersionId || parsed.data.effectiveAt
    if (hasV2Identity && !usesV2) {
      return failureResult("A confirmação está incompleta. Verifique o template novamente.")
    }
    let planId: string
    let idempotentRetry = false
    if (usesV2) {
      const result = await applyDevelopmentTemplateV2({
          applicationId: parsed.data.applicationId!,
          idempotencyKey: parsed.data.idempotencyKey!,
          correlationId: parsed.data.correlationId!,
          templateVersionId: parsed.data.templateVersionId!,
          effectiveAt: parsed.data.effectiveAt!,
          employeeId: parsed.data.employeeId,
          ownerId: parsed.data.ownerId || undefined,
          priority: parsed.data.priority,
          startDate: parsed.data.startDate || new Date().toISOString().slice(0, 10),
          dueDate: parsed.data.dueDate || undefined,
        })
      if (result.status !== "created" && result.status !== "idempotent_retry") {
        const code = "code" in result
          ? result.code
          : result.status === "resolution_failure"
            ? result.errors[0]?.code
            : undefined
        return failureResult(developmentTemplateApplicationMessage(code ?? result.status))
      }
      planId = result.planId
      idempotentRetry = result.status === "idempotent_retry"
    } else {
      const result = await applyDevelopmentTemplate({
        employeeId:
          parsed.data.employeeId,

        templateId:
          parsed.data.templateId,

        ownerId:
          parsed.data.ownerId ||
          undefined,

        priority:
          parsed.data.priority,

        startDate:
          parsed.data.startDate ||
          undefined,

        dueDate:
          parsed.data.dueDate ||
          undefined,
        })
      planId = result.planId
    }

    revalidatePath(
      "/app/development"
    )

    revalidatePath(
      `/app/development/plans/${planId}`
    )

    return successResult<ApplyDevelopmentTemplateResult>(
      idempotentRetry
        ? "Aplicação já concluída; o mesmo plano foi recuperado."
        : "Plano de desenvolvimento criado com sucesso.",
      {
        planId,
      }
    )
  } catch (error) {
    console.error(
      "Erro ao aplicar template de desenvolvimento:",
      error
    )

    return failureResult(
      getErrorMessage(error)
    )
  }
}
