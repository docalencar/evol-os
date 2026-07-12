import type { DevelopmentActionType } from "../../constants/development-action"
import { createDevelopmentTemplateActionRepository } from "../repositories/development-template-action-repository"
import { getDevelopmentTemplateById } from "./get-development-template-by-id"
import { getDevelopmentTemplateGoals } from "./get-development-template-goals"

type CreateActionForTemplateGoalParams = {
  companyId: string
  templateId: string
  templateGoalId: string
  title: string
  description?: string
  type: DevelopmentActionType
  suggestedDueDays?: number
}

type DevelopmentTemplateGoalRow = {
  id: string
}

export async function createActionForTemplateGoal({
  companyId,
  templateId,
  templateGoalId,
  title,
  description,
  type,
  suggestedDueDays,
}: CreateActionForTemplateGoalParams) {
  const template = await getDevelopmentTemplateById(
    companyId,
    templateId
  )

  if (!template) {
    throw new Error("Template não encontrado.")
  }

  if (
    template.scope !== "company" ||
    template.companyId !== companyId
  ) {
    throw new Error(
      "Este template não pode ser alterado."
    )
  }

  const templateGoals =
    await getDevelopmentTemplateGoals(templateId)

  const goalExists = (
    templateGoals as DevelopmentTemplateGoalRow[]
  ).some((goal) => goal.id === templateGoalId)

  if (!goalExists) {
    throw new Error(
      "A competência não pertence a este template."
    )
  }

  const repository =
    await createDevelopmentTemplateActionRepository()

  const {
    data: existingActions,
    error: findError,
  } = await repository.findByGoal(templateGoalId)

  if (findError) {
    throw new Error(
      "Não foi possível verificar as ações existentes."
    )
  }

  const actions = existingActions ?? []

  const nextOrderIndex =
    actions.length === 0
      ? 0
      : Math.max(
          ...actions.map(
            (action) => action.orderIndex
          )
        ) + 1

  const { data, error } = await repository.create({
    templateGoalId,
    title,
    description: description ?? "",
    type,
    suggestedDueDays,
    orderIndex: nextOrderIndex,
  })

  if (error) {
    throw new Error(
      "Não foi possível adicionar a ação de desenvolvimento."
    )
  }

  return data
}
