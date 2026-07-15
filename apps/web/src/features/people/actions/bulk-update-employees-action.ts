"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  createEmployeeRepository,
} from "../repositories/employee-repository"
import {
  employeeStatusSchema,
  updateEmployeeSchema,
} from "../schemas/employee-schema"

const bulkEmployeeChangeSchema = z.discriminatedUnion(
  "field",
  [
    z.object({
      field: z.literal("status"),
      value: employeeStatusSchema,
    }),

    z.object({
      field: z.literal("positionId"),
      value: z.string().uuid().or(z.literal("")),
    }),

    z.object({
      field: z.literal("teamId"),
      value: z.string().uuid().or(z.literal("")),
    }),

    z.object({
      field: z.literal("managerId"),
      value: z.string().uuid().or(z.literal("")),
    }),
  ]
)

const bulkUpdateEmployeesSchema = z.object({
  employeeIds: z
    .array(z.string().uuid())
    .min(1, "Selecione pelo menos um colaborador.")
    .max(500, "Atualize no máximo 500 colaboradores por vez."),

  change: bulkEmployeeChangeSchema,
})

export type BulkEmployeeChange =
  z.infer<typeof bulkEmployeeChangeSchema>

export type BulkUpdateEmployeesResult = {
  success: boolean
  message: string
  updatedCount: number
  failedCount: number
  errors: Array<{
    employeeId: string
    message: string
  }>
}

function createUpdateInput(
  change: BulkEmployeeChange
) {
  switch (change.field) {
    case "status":
      return {
        status: change.value,
      }

    case "positionId":
      return {
        positionId: change.value,
      }

    case "teamId":
      return {
        teamId: change.value,
      }

    case "managerId":
      return {
        managerId: change.value,
      }
  }
}

export async function bulkUpdateEmployeesAction(
  input: unknown
): Promise<BulkUpdateEmployeesResult> {
  const parsedInput =
    bulkUpdateEmployeesSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para atualização em lote.",
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    }
  }

  const { companyId } =
    await getCurrentCompanyContext()

  const updateInput = createUpdateInput(
    parsedInput.data.change
  )

  const parsedUpdate =
    updateEmployeeSchema.safeParse(updateInput)

  if (!parsedUpdate.success) {
    return {
      success: false,
      message:
        "A alteração selecionada não possui um valor válido.",
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    }
  }

  const repository =
    await createEmployeeRepository()

  let updatedCount = 0

  const errors: BulkUpdateEmployeesResult["errors"] = []

  for (const employeeId of parsedInput.data.employeeIds) {
    const { error } = await repository.update(
      companyId,
      employeeId,
      parsedUpdate.data
    )

    if (error) {
      errors.push({
        employeeId,
        message: error.message,
      })

      continue
    }

    updatedCount += 1
  }

  revalidatePath("/app")
  revalidatePath("/app/people")

  return {
    success: updatedCount > 0,
    message:
      updatedCount > 0
        ? `${updatedCount} colaborador${
            updatedCount === 1 ? "" : "es"
          } atualizado${
            updatedCount === 1 ? "" : "s"
          } com sucesso.`
        : "Nenhum colaborador pôde ser atualizado.",
    updatedCount,
    failedCount: errors.length,
    errors,
  }
}
