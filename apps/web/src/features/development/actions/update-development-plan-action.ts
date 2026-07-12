"use server"

import { revalidatePath } from "next/cache"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  updateDevelopmentPlanSchema,
  type UpdateDevelopmentPlanInput,
} from "../schemas/development-plan-schema"

import {
  updateDevelopmentPlan,
} from "../services/update-development-plan"

export async function updateDevelopmentPlanAction(
  planId: string,
  values: UpdateDevelopmentPlanInput
) {
  const parsed =
    updateDevelopmentPlanSchema.safeParse(
      values
    )

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos.",
    }
  }

  try {
    const { companyId } =
      await getCurrentCompanyContext()

    await updateDevelopmentPlan(
      companyId,
      planId,
      parsed.data
    )

    revalidatePath("/app/development")

    revalidatePath(
      `/app/development/plans/${planId}`
    )

    return {
      success: true,
      message:
        "Plano atualizado com sucesso.",
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o plano.",
    }
  }
}
