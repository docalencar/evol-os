"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  createPlanningChangeSetRepository,
} from "../change-sets/repositories"
import {
  createScenarioRepository,
} from "../repositories/scenario-repository"

const deletePlanningChangeSetActionInputSchema =
  z.object({
    scenarioId: z
      .string()
      .uuid(
        "O cenário de planejamento informado é inválido."
      ),
    changeSetId: z
      .string()
      .uuid(
        "A alteração de planejamento informada é inválida."
      ),
  })

export type DeletePlanningChangeSetActionInput =
  z.infer<
    typeof deletePlanningChangeSetActionInputSchema
  >

export type DeletePlanningChangeSetActionState =
  | {
      success: true
      message: string
    }
  | {
      success: false
      message: string
    }

function getDeletePlanningChangeSetErrorMessage(
  error: unknown
): string {
  if (!(error instanceof Error)) {
    return "Não foi possível excluir a alteração."
  }

  const message = error.message.toLowerCase()

  if (
    message.includes(
      "cenário de planejamento não encontrado"
    )
  ) {
    return "O cenário de planejamento não foi encontrado."
  }

  if (
    message.includes(
      "alteração de planejamento não encontrada"
    )
  ) {
    return "A alteração de planejamento não foi encontrada."
  }

  if (
    message.includes(
      "alteração não pertence ao cenário"
    )
  ) {
    return "A alteração informada não pertence a este cenário."
  }

  if (
    message.includes(
      "somente cenários em rascunho podem ter alterações excluídas"
    )
  ) {
    return "Somente cenários em rascunho podem ter alterações excluídas."
  }

  if (
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) {
    return "Você não tem permissão para excluir esta alteração."
  }

  if (
    message.includes(
      "organization_planning_change_sets"
    ) &&
    message.includes("foreign key")
  ) {
    return "Esta alteração não pode ser excluída porque possui registros vinculados."
  }

  return error.message
}

export async function deletePlanningChangeSetAction(
  input: DeletePlanningChangeSetActionInput
): Promise<DeletePlanningChangeSetActionState> {
  const parsed =
    deletePlanningChangeSetActionInputSchema.safeParse(
      input
    )

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos para excluir a alteração.",
    }
  }

  try {
    const {
      companyId,
    } = await getCurrentCompanyContext()

    const [
      scenarioRepository,
      changeSetRepository,
    ] = await Promise.all([
      createScenarioRepository(),
      createPlanningChangeSetRepository(),
    ])

    const [
      scenario,
      changeSet,
    ] = await Promise.all([
      scenarioRepository.findById(
        companyId,
        parsed.data.scenarioId
      ),
      changeSetRepository.findById(
        companyId,
        parsed.data.changeSetId
      ),
    ])

    if (!scenario) {
      throw new Error(
        "Cenário de planejamento não encontrado."
      )
    }

    if (!changeSet) {
      throw new Error(
        "Alteração de planejamento não encontrada."
      )
    }

    if (
      changeSet.scenarioId !==
      parsed.data.scenarioId
    ) {
      throw new Error(
        "A alteração não pertence ao cenário."
      )
    }

    const scenarioContract =
      scenario.toContract()

    if (scenarioContract.status !== "draft") {
      throw new Error(
        "Somente cenários em rascunho podem ter alterações excluídas."
      )
    }

    await changeSetRepository.delete(
      companyId,
      parsed.data.changeSetId
    )

    revalidatePath("/app/organization")

    return {
      success: true,
      message: "Alteração excluída com sucesso.",
    }
  } catch (error) {
    console.error(
      "Organization Planning Change Set Delete Error:",
      error
    )

    return {
      success: false,
      message:
        getDeletePlanningChangeSetErrorMessage(
          error
        ),
    }
  }
}
