import { createAssessmentAnswerRepository } from "../repositories/assessment-answer-repository"
import { createAssessmentResponseRepository } from "../repositories/assessment-response-repository"
import type { AssessmentAnswer } from "../types/assessment-answer"
import type { AssessmentResponse } from "../types/assessment-response"

export type EmployeeAssessmentSummary = Readonly<{
  completedAssessments: number
  pendingAssessments: number
  averageScore: number | null
  latestAssessmentAt: string | null
}>

export async function getEmployeeAssessmentSummary(
  companyId: string,
  employeeId: string
): Promise<EmployeeAssessmentSummary> {
  const responsesRepository = await createAssessmentResponseRepository()
  const { data, error } = await responsesRepository.findByEmployee(
    companyId,
    employeeId
  )

  if (error) throw new Error("Erro ao buscar avaliações do colaborador.")

  const responses = (data ?? []) as AssessmentResponse[]
  const completed = responses.filter((response) => response.status === "completed")
  const answersRepository = await createAssessmentAnswerRepository()
  const answersResult = await answersRepository.findAllByResponses(
    companyId,
    completed.map((response) => response.id)
  )

  if (answersResult.error) throw new Error("Erro ao buscar resultados das avaliações.")

  return summarizeEmployeeAssessments(
    responses,
    (answersResult.data ?? []) as AssessmentAnswer[]
  )
}

export function summarizeEmployeeAssessments(
  responses: readonly AssessmentResponse[],
  answers: readonly AssessmentAnswer[]
): EmployeeAssessmentSummary {
  const completed = responses.filter((response) => response.status === "completed")
  const scores = answers
    .map((answer) => answer.score)
    .filter((score): score is number => score !== null)
  const completedDates = completed
    .map((response) => response.completed_at)
    .filter((date): date is string => date !== null)
    .sort((left, right) => right.localeCompare(left))

  return Object.freeze({
    completedAssessments: completed.length,
    pendingAssessments: responses.filter((response) =>
      response.status === "draft" ||
      response.status === "in_progress" ||
      response.status === "submitted"
    ).length,
    averageScore: scores.length === 0
      ? null
      : scores.reduce((total, score) => total + score, 0) / scores.length,
    latestAssessmentAt: completedDates[0] ?? null,
  })
}
