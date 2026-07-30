"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/actions"
import { successResult } from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"
import type { ScenarioDTO } from "../application"
import { createServerPlanningApplication } from "../server"

export async function restoreScenarioAction(input: Readonly<{ scenarioId: string; expectedVersion: number }>): Promise<ActionResult<ScenarioDTO>> {
  try {
    const { companyId } = await getCurrentCompanyContext()
    const application = await createServerPlanningApplication()
    const scenario = await application.scenarioOperations.restore({ ...input, companyId, occurredAt: new Date() })
    revalidatePath("/app/organization")
    revalidatePath("/app/organization/planning/timeline")
    return successResult("Cenário restaurado com sucesso.", scenario)
  } catch (error) {
    console.error("Erro ao restaurar cenário de planejamento:", error)
    return { success: false, message: "Não foi possível restaurar o cenário." }
  }
}
