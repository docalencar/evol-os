"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/actions"
import {
  failureResult,
  successResult,
} from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import {
  publishScenarioCommandSchema,
  type PublishedScenarioDTO,
} from "../application"
import { createServerPlanningApplication } from "../server"

export type PublishScenarioActionInput = Readonly<{
  scenarioId: string
  snapshotId: string
  expectedVersion: number
}>

export async function publishScenarioAction(
  input: PublishScenarioActionInput
): Promise<ActionResult<PublishedScenarioDTO | void>> {
  try {
    const { companyId } = await getCurrentCompanyContext()
    const command = publishScenarioCommandSchema.safeParse({
      ...input,
      companyId,
      occurredAt: new Date(),
    })

    if (!command.success) {
      return failureResult(
        command.error.issues[0]?.message ??
          "Dados inválidos para publicar o cenário."
      )
    }

    const application = await createServerPlanningApplication()
    const result = await application.publishScenario.execute(
      command.data
    )

    revalidatePath("/app/organization")

    return successResult(
      "Cenário publicado com sucesso.",
      result
    )
  } catch (error) {
    console.error("Erro ao publicar cenário de planejamento:", error)

    return failureResult(
      error instanceof Error
        ? error.message
        : "Não foi possível publicar o cenário."
    )
  }
}
