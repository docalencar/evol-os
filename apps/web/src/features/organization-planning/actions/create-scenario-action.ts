"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/actions"
import { successResult } from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import {
  createScenarioCommandSchema,
  type ScenarioDTO,
} from "../application"
import { createServerPlanningApplication } from "../server"

export type CreateScenarioActionInput = Readonly<{
  scenarioId: string
  workspaceId: string
  baseSnapshotId: string
  name: string
  description?: string | null
}>

export async function createScenarioAction(
  input: CreateScenarioActionInput
): Promise<ActionResult<ScenarioDTO>> {
  try {
    const { companyId } = await getCurrentCompanyContext()
    const command = createScenarioCommandSchema.safeParse({
      ...input,
      companyId,
      occurredAt: new Date(),
    })

    if (!command.success) {
      return {
        success: false,
        message:
          command.error.issues[0]?.message ??
          "Dados inválidos para criar o cenário.",
      }
    }

    const application = await createServerPlanningApplication()
    const scenario = await application.createScenario.execute(
      command.data
    )

    revalidatePath("/app/organization")

    return successResult(
      "Cenário criado com sucesso.",
      scenario
    )
  } catch (error) {
    console.error("Erro ao criar cenário de planejamento:", error)

    return {
      success: false,
      message: "Não foi possível criar o cenário.",
    }
  }
}
