"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/actions"
import { successResult } from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import {
  archiveScenarioCommandSchema,
  type ScenarioDTO,
} from "../application"
import { createServerPlanningApplication } from "../server"

export type ArchiveScenarioActionInput = Readonly<{
  scenarioId: string
  expectedVersion: number
}>

export async function archiveScenarioAction(
  input: ArchiveScenarioActionInput
): Promise<ActionResult<ScenarioDTO>> {
  try {
    const { companyId } = await getCurrentCompanyContext()
    const command = archiveScenarioCommandSchema.safeParse({
      ...input,
      companyId,
      occurredAt: new Date(),
    })

    if (!command.success) {
      return {
        success: false,
        message:
          command.error.issues[0]?.message ??
          "Dados inválidos para arquivar o cenário.",
      }
    }

    const application = await createServerPlanningApplication()
    const scenario = await application.archiveScenario.execute(
      command.data
    )

    revalidatePath("/app/organization")

    return successResult(
      "Cenário arquivado com sucesso.",
      scenario
    )
  } catch (error) {
    console.error("Erro ao arquivar cenário de planejamento:", error)

    return {
      success: false,
      message: "Não foi possível arquivar o cenário.",
    }
  }
}
