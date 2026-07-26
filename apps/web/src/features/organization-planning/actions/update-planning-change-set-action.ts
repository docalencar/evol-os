"use server"

import { revalidatePath } from "next/cache"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  createPlanningChangeSetRepository,
} from "../change-sets/repositories"

import {
  createScenarioRepository,
} from "../repositories/scenario-repository"

import {
  updatePlanningChangeSetActionInputSchema,
  type UpdatePlanningChangeSetActionInput,
} from "../schemas/planning-action-schemas"


export type UpdatePlanningChangeSetActionState =
  | {
      success: true
      message: string
      version: number
    }
  | {
      success: false
      message: string
    }


function getUpdatePlanningChangeSetErrorMessage(
  error: unknown
): string {
  if (!(error instanceof Error)) {
    return "Não foi possível atualizar a alteração."
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
    return "A alteração informada não pertence ao cenário."
  }

  if (
    message.includes(
      "tipo da alteração não pode ser modificado"
    )
  ) {
    return "O tipo da alteração não pode ser modificado."
  }

  if (
    message.includes(
      "somente cenários em rascunho"
    )
  ) {
    return "Somente cenários em rascunho podem ter alterações atualizadas."
  }

  if (
    message.includes(
      "planning_change_set_version_conflict"
    )
  ) {
    return "Esta alteração foi modificada por outra operação. Atualize a página e tente novamente."
  }

  if (
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) {
    return "Você não tem permissão para atualizar esta alteração."
  }

  return error.message
}


export async function updatePlanningChangeSetAction(
  input: UpdatePlanningChangeSetActionInput
): Promise<UpdatePlanningChangeSetActionState> {

  const parsed =
    updatePlanningChangeSetActionInputSchema.safeParse(
      input
    )


  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos para atualizar a alteração.",
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


    if (
      changeSet.changeType !==
      parsed.data.changeType
    ) {
      throw new Error(
        "O tipo da alteração não pode ser modificado."
      )
    }


    if (
      scenario.status !== "draft"
    ) {
      throw new Error(
        "Somente cenários em rascunho podem ter alterações atualizadas."
      )
    }


    if (
      changeSet.version !==
      parsed.data.expectedVersion
    ) {
      throw new Error(
        "PLANNING_CHANGE_SET_VERSION_CONFLICT"
      )
    }


    const updatedChangeSet =
      await changeSetRepository.update(
        companyId,
        parsed.data.changeSetId,
        {
          expectedVersion:
            parsed.data.expectedVersion,

          payload:
            parsed.data.payload,
        }
      )


    revalidatePath(
      "/app/organization"
    )


    return {
      success: true,
      message:
        "Alteração atualizada com sucesso.",
      version:
        updatedChangeSet.version,
    }

  } catch (error) {

    console.error(
      "Organization Planning Change Set Update Error:",
      error
    )


    return {
      success: false,
      message:
        getUpdatePlanningChangeSetErrorMessage(
          error
        ),
    }
  }
}