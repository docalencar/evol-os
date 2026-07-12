import { getCompetencyById } from "@/features/competencies"

import { createDevelopmentTemplateGoalRepository } from "../repositories/development-template-goal-repository"
import { getDevelopmentTemplateById } from "./get-development-template-by-id"

type CreateDevelopmentTemplateGoalParams = {
  companyId: string
  templateId: string
  competencyId: string
  suggestedTargetLevel: number
}

type DevelopmentTemplateGoalRow = {
  competency_id: string
  order_index: number
}

export async function createDevelopmentTemplateGoal({
  companyId,
  templateId,
  competencyId,
  suggestedTargetLevel,
}: CreateDevelopmentTemplateGoalParams) {
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

  const competency = await getCompetencyById(
    companyId,
    competencyId
  )

  if (!competency || !competency.active) {
    throw new Error(
      "A competência selecionada não está disponível."
    )
  }

  const repository =
    await createDevelopmentTemplateGoalRepository()

  const {
    data: existingGoals,
    error: findError,
  } = await repository.findByTemplate(templateId)

  if (findError) {
    throw new Error(
      "Não foi possível verificar as competências do template."
    )
  }

  const goals =
    (existingGoals ?? []) as DevelopmentTemplateGoalRow[]

  const alreadyExists = goals.some(
    (goal) => goal.competency_id === competencyId
  )

  if (alreadyExists) {
    throw new Error(
      "Esta competência já foi adicionada ao template."
    )
  }

  const nextOrderIndex =
    goals.length === 0
      ? 0
      : Math.max(
          ...goals.map((goal) => goal.order_index)
        ) + 1

  const { data, error } = await repository.create({
    templateId,
    competencyId,
    description: "",
    suggestedTargetLevel,
    orderIndex: nextOrderIndex,
  })

  if (error) {
    throw new Error(
      "Não foi possível adicionar a competência ao template."
    )
  }

  return data
}
