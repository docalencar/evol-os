import type { AssessmentAnswer } from "./assessment-answer"
import type { AssessmentResponse } from "./assessment-response"

export type AssessmentAdministrativeResponse = AssessmentResponse & {
  employee: Readonly<{
    id: string
    full_name: string
    email: string | null
  }>
  evaluator: Readonly<{
    id: string
    full_name: string
  }>
}

export type AssessmentAdministrativeRead = Readonly<{
  responses: AssessmentAdministrativeResponse[]
  answers: AssessmentAnswer[]
}>

export type AssessmentEvaluateeResult = Readonly<{
  assessmentResponseId: string
  status: string
  visibility: string
  overallScore: number | null
  competencies: ReadonlyArray<{
    sectionId: string
    sectionName: string
    averageScore: number
  }>
  answers: ReadonlyArray<Record<string, unknown>>
}>
