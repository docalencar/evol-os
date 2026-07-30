"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/actions"
import { successResult } from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import {
  publishScenarioCommandSchema,
  type PublishedScenarioDTO,
} from "../application"
import { createServerPlanningApplication } from "../server"
import { getPublicationRevalidationPaths } from "./publication-revalidation"

export type PublishScenarioActionInput = Readonly<{
  scenarioId: string
  snapshotId: string
  expectedVersion: number
}>

export async function publishScenarioAction(
  input: PublishScenarioActionInput
): Promise<ActionResult<PublishedScenarioDTO>> {
  try {
    const { companyId, currentUser } = await getCurrentCompanyContext()
    const command = publishScenarioCommandSchema.safeParse({
      ...input,
      companyId,
      occurredAt: new Date(),
    })

    if (!command.success) {
      return {
        success: false,
        message:
          command.error.issues[0]?.message ??
          "Dados inválidos para publicar o cenário.",
      }
    }

    const application = await createServerPlanningApplication(currentUser)
    const result = await application.publishScenario.execute(
      command.data
    )

    for (const path of getPublicationRevalidationPaths(input.scenarioId)) {
      revalidatePath(path)
    }

    return successResult(
      "Cenário publicado com sucesso.",
      result
    )
  } catch (error) {
    console.error("Erro ao publicar cenário de planejamento:", error)

    return {
      success: false,
      message: "Não foi possível publicar o cenário.",
    }
  }
}
