"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/actions"
import { successResult } from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"
import { createScenarioBranchCommandSchema, type ScenarioDTO } from "../application"
import { createServerPlanningApplication } from "../server"

export async function duplicateScenarioAction(input: Readonly<{ sourceScenarioId: string; scenarioId: string }>): Promise<ActionResult<ScenarioDTO>> {
  try {
    const { companyId } = await getCurrentCompanyContext()
    const command = createScenarioBranchCommandSchema.safeParse({ ...input, companyId, occurredAt: new Date() })
    if (!command.success) return { success: false, message: command.error.issues[0]?.message ?? "Dados inválidos para duplicar o cenário." }
    const application = await createServerPlanningApplication()
    const scenario = await application.createScenarioBranch.execute(command.data)
    revalidatePlanning()
    return successResult("Cenário duplicado com sucesso.", scenario)
  } catch (error) {
    console.error("Erro ao duplicar cenário de planejamento:", error)
    return { success: false, message: "Não foi possível duplicar o cenário." }
  }
}

function revalidatePlanning() {
  revalidatePath("/app/organization")
  revalidatePath("/app/organization/planning/timeline")
}
