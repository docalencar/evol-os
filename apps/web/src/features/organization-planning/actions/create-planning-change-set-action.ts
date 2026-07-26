"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  CreatePlanningChangeSetHandler,
} from "../application/handlers"
import {
  SimplePlanningUnitOfWork,
} from "../application/transactions"
import {
  createPlanningChangeSetRepository,
} from "../change-sets/repositories"
import {
  createScenarioRepository,
} from "../repositories/scenario-repository"
import {
  createPlanningChangeSetActionInputSchema,
  type CreatePlanningChangeSetActionInput,
} from "../schemas/planning-action-schemas"

export type CreatePlanningChangeSetActionState =
  | {
      success: true
      message: string
      changeSetId: string
    }
  | {
      success: false
      message: string
    }

function getPlanningChangeSetErrorMessage(
  error: unknown
) {
  if (!(error instanceof Error)) {
    return "Não foi possível criar a alteração."
  }

  const message = error.message.toLowerCase()

  if (message.includes("cenário não encontrado")) {
    return "O cenário de planejamento não foi encontrado."
  }

  if (
    message.includes(
      "apenas cenários em rascunho podem receber alterações"
    )
  ) {
    return "Somente cenários em rascunho podem receber novas alterações."
  }

  if (
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) {
    return "Você não tem permissão para criar alterações neste cenário."
  }

  if (
    message.includes(
      "organization_planning_change_sets_scenario_id_fkey"
    )
  ) {
    return "O cenário informado não está disponível."
  }

  if (
    message.includes(
      "organization_planning_change_sets_company_id_fkey"
    )
  ) {
    return "A empresa informada não está disponível."
  }

  return error.message
}

export async function createPlanningChangeSetAction(
  input: CreatePlanningChangeSetActionInput
): Promise<CreatePlanningChangeSetActionState> {
  const parsed =
    createPlanningChangeSetActionInputSchema.safeParse(
      input
    )

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos para criar a alteração.",
    }
  }

  try {
    const {
      companyId,
    } = await getCurrentCompanyContext()

    const changeSetId = randomUUID()
    const occurredAt = new Date()

    const [
      scenarioRepository,
      changeSetRepository,
    ] = await Promise.all([
      createScenarioRepository(),
      createPlanningChangeSetRepository(),
    ])

    const handler =
      new CreatePlanningChangeSetHandler(
        scenarioRepository,
        changeSetRepository,
        new SimplePlanningUnitOfWork()
      )

    switch (parsed.data.changeType) {
      case "department.create": {
        await handler.execute({
          companyId,
          changeSetId,
          scenarioId: parsed.data.scenarioId,
          changeType: parsed.data.changeType,
          payload: parsed.data.payload,
          occurredAt,
        })

        break
      }

      case "department.update": {
        await handler.execute({
          companyId,
          changeSetId,
          scenarioId: parsed.data.scenarioId,
          changeType: parsed.data.changeType,
          payload: parsed.data.payload,
          occurredAt,
        })

        break
      }

      case "department.archive": {
        await handler.execute({
          companyId,
          changeSetId,
          scenarioId: parsed.data.scenarioId,
          changeType: parsed.data.changeType,
          payload: parsed.data.payload,
          occurredAt,
        })

        break
      }

      case "team.create": {
        await handler.execute({
          companyId,
          changeSetId,
          scenarioId: parsed.data.scenarioId,
          changeType: parsed.data.changeType,
          payload: parsed.data.payload,
          occurredAt,
        })

        break
      }

      case "team.update": {
        await handler.execute({
          companyId,
          changeSetId,
          scenarioId: parsed.data.scenarioId,
          changeType: parsed.data.changeType,
          payload: parsed.data.payload,
          occurredAt,
        })

        break
      }

      case "team.archive": {
        await handler.execute({
          companyId,
          changeSetId,
          scenarioId: parsed.data.scenarioId,
          changeType: parsed.data.changeType,
          payload: parsed.data.payload,
          occurredAt,
        })

        break
      }
    }

    revalidatePath("/app/organization")

    return {
      success: true,
      message: "Alteração criada com sucesso.",
      changeSetId,
    }
  } catch (error) {
    console.error(
      "Organization Planning Change Set Create Error:",
      error
    )

    return {
      success: false,
      message:
        getPlanningChangeSetErrorMessage(error),
    }
  }
}
