import { calculateAssessmentInsights } from "./calculate-assessment-insights"
import { calculateAssessmentProgress } from "./calculate-assessment-progress"

import type { AssessmentAnswer } from "../types/assessment-answer"
import type { AssessmentQuestion } from "../types/assessment-question"
import type { AssessmentSection } from "../types/assessment-section"
import type { AssessmentTemplate } from "../types/assessment-template"

type CreateAssessmentExecutionViewModelInput = {
  companyId: string
  assessmentResponseId: string
  template: AssessmentTemplate
  sections: AssessmentSection[]
  questions: AssessmentQuestion[]
  questionsBySection: Map<string, AssessmentQuestion[]>
  answers: AssessmentAnswer[]
  totalSections: number
  currentSection: number
}

export function createAssessmentExecutionViewModel({
  companyId,
  assessmentResponseId,
  template,
  sections,
  questions,
  questionsBySection,
  answers,
  totalSections,
  currentSection,
}: CreateAssessmentExecutionViewModelInput) {
  const progress = calculateAssessmentProgress(
    questions,
    answers
  )

  const insights =
    calculateAssessmentInsights(
      sections,
      questionsBySection,
      answers
    )

  return {
    companyId,
    assessmentResponseId,

    title: template.name,
    description: template.description,

    status: "Em andamento",

    estimatedMinutes: Math.max(
      1,
      Math.ceil(questions.length / 3)
    ),

    currentSection,
    totalSections,

    ...progress,

    insights,
  }
}
