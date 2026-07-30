"use server"

import { revalidatePath } from "next/cache"
import type { ActionResult } from "@/lib/actions"
import { successResult } from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"
import { createServerPlanningApplication } from "../server"

export async function deleteScenarioAction(input: Readonly<{ scenarioId: string; expectedVersion: number }>): Promise<ActionResult<null>> {
  try {
    const { companyId } = await getCurrentCompanyContext()
    const application = await createServerPlanningApplication()
    await application.scenarioOperations.delete({ ...input, companyId })
    revalidatePath("/app/organization")
    revalidatePath("/app/organization/planning/timeline")
    return successResult("Cenário excluído com sucesso.", null)
  } catch (error) {
    console.error("Erro ao excluir cenário de planejamento:", error)
    return { success: false, message: "Não foi possível excluir o cenário." }
  }
}
