"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import type {
  DevelopmentPlanStatus,
} from "../constants/development-plan"

import {
  changeDevelopmentPlanStatus,
} from "../services/change-development-plan-status"

const schema = z.object({
  status: z.enum([
    "draft",
    "active",
    "completed",
    "cancelled",
  ]),
})

export async function changeDevelopmentPlanStatusAction(
  planId: string,
  values: {
    status: DevelopmentPlanStatus
  }
) {
  const parsed =
    schema.safeParse(values)

  if (!parsed.success) {
    return {
      success: false,
      message:
        "Status inválido.",
    }
  }

  try {
    const { companyId } =
      await getCurrentCompanyContext()

    await changeDevelopmentPlanStatus(
      companyId,
      planId,
      parsed.data.status
    )

    revalidatePath("/app/development")

    revalidatePath(
      `/app/development/plans/${planId}`
    )

    return {
      success: true,
      message:
        "Status atualizado com sucesso.",
    }
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Erro ao atualizar o plano.",
    }
  }
}
