"use server"

import { revalidatePath } from "next/cache"

import { requireAssessmentAdministrator } from "../application/assessment-authorization"
import { loadAssessmentActor } from "../application/load-assessment-actor"
import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"

type GenerateCycleAssessmentsInput = {
  companyId: string
  assessmentCycleId: string
}

export async function generateCycleAssessmentsAction({
  companyId,
  assessmentCycleId,
}: GenerateCycleAssessmentsInput) {
  try {
    const actor = await loadAssessmentActor()
    requireAssessmentAdministrator(actor, companyId)
  } catch {
    return {
      success: false,
      message: "Você não possui permissão para gerar avaliações.",
    }
  }

  const responseRepository =
    await createAssessmentResponseRepository()

  const { data, error } =
    await responseRepository.generateForCycle(
      companyId,
      assessmentCycleId
    )

  if (error) {
    if (error.message === "ASSESSMENT_PEER_SELECTION_NOT_SUPPORTED") {
      return {
        success: false,
        message:
          "A seleção segura de pares ainda não está disponível. Desative a avaliação por pares para gerar este ciclo.",
      }
    }

    return {
      success: false,
      message:
        "Não foi possível gerar as avaliações do ciclo.",
    }
  }

  revalidatePath(
    `/app/assessments/cycles/${assessmentCycleId}`
  )

  const result = data as {
    createdResponseCount?: number
    perspectives?: string[]
  } | null
  const createdCount = result?.createdResponseCount ?? 0
  const perspectiveLabels: Record<string, string> = {
    self: "autoavaliação",
    manager: "gestor",
    direct_report: "liderado",
  }
  const perspectives = (result?.perspectives ?? [])
    .map((perspective) => perspectiveLabels[perspective])
    .filter(Boolean)

  return {
    success: true,
    message:
      createdCount === 0
        ? "Nenhuma nova avaliação foi criada. As avaliações já estão atualizadas."
        : `${createdCount} avaliação(ões) gerada(s)${
            perspectives.length > 0
              ? `: ${perspectives.join(", ")}`
              : ""
          }.`,
  }
}
