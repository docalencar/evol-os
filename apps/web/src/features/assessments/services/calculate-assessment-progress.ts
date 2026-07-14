import type { AssessmentAnswer } from "../types/assessment-answer"
import type { AssessmentQuestion } from "../types/assessment-question"

type AssessmentProgress = {
  total: number
  answered: number

  requiredTotal: number
  requiredAnswered: number

  optionalTotal: number
  optionalAnswered: number

  missingRequired: number

  percentage: number

  canSubmit: boolean
}

export function calculateAssessmentProgress(
  questions: AssessmentQuestion[],
  answers: AssessmentAnswer[]
): AssessmentProgress {
  const answeredIds = new Set(
    answers.map((answer) => answer.assessment_question_id)
  )

  const requiredQuestions = questions.filter(
    (question) => question.required
  )

  const optionalQuestions = questions.filter(
    (question) => !question.required
  )

  const requiredAnswered = requiredQuestions.filter(
    (question) => answeredIds.has(question.id)
  ).length

  const optionalAnswered = optionalQuestions.filter(
    (question) => answeredIds.has(question.id)
  ).length

  const answered =
    requiredAnswered + optionalAnswered

  const total = questions.length

  const percentage =
    total === 0
      ? 0
      : Math.round((answered / total) * 100)

  return {
    total,
    answered,

    requiredTotal: requiredQuestions.length,
    requiredAnswered,

    optionalTotal: optionalQuestions.length,
    optionalAnswered,

    missingRequired:
      requiredQuestions.length - requiredAnswered,

    percentage,

    canSubmit:
      requiredAnswered === requiredQuestions.length,
  }
}
