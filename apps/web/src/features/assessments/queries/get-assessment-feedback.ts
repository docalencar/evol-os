import type { AssessmentAnswer } from "../types/assessment-answer"
import type { AssessmentQuestion } from "../types/assessment-question"
import type { AssessmentSection } from "../types/assessment-section"

export type AssessmentFeedbackQueryResult = {
  overallScore: number
  competencies: {
    sectionId: string
    sectionName: string
    averageScore: number
  }[]
}

export function getAssessmentFeedback(
  sections: AssessmentSection[],
  questions: AssessmentQuestion[],
  answers: AssessmentAnswer[]
): AssessmentFeedbackQueryResult {

  const competencies = sections.map(section => {

    const sectionQuestions =
      questions.filter(
        question =>
          question.assessment_section_id === section.id
      )

    const sectionAnswers =
      answers.filter(answer =>
        sectionQuestions.some(
          question =>
            question.id === answer.assessment_question_id
        )
      )

    const scores =
      sectionAnswers
        .map(answer => answer.score)
        .filter(
          (value): value is number =>
            value !== null
        )

    const average =
      scores.length === 0
        ? 0
        : scores.reduce((a,b)=>a+b,0)/scores.length

    return {
      sectionId: section.id,
      sectionName: section.name,
      averageScore: average,
    }

  })

  const overall =
    competencies.length === 0
      ? 0
      : competencies.reduce(
          (a,b)=>a+b.averageScore,
          0
        ) / competencies.length

  return {
    overallScore: overall,
    competencies,
  }

}
