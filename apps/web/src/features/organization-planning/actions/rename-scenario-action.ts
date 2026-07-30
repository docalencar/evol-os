"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/actions"
import { successResult } from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"
import type { ScenarioDTO } from "../application"
import { createServerPlanningApplication } from "../server"

export async function renameScenarioAction(input: Readonly<{ scenarioId: string; expectedVersion: number; name: string }>): Promise<ActionResult<ScenarioDTO>> {
  try {
    const { companyId } = await getCurrentCompanyContext()
    const application = await createServerPlanningApplication()
    const scenario = await application.scenarioOperations.rename({ ...input, companyId, occurredAt: new Date() })
    revalidatePath("/app/organization")
    revalidatePath("/app/organization/planning/timeline")
    return successResult("Cenário renomeado com sucesso.", scenario)
  } catch (error) {
    console.error("Erro ao renomear cenário de planejamento:", error)
    return { success: false, message: "Não foi possível renomear o cenário." }
  }
}
