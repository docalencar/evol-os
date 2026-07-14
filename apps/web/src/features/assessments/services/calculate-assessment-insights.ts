import type { AssessmentAnswer } from "../types/assessment-answer"
import type { AssessmentQuestion } from "../types/assessment-question"
import type { AssessmentSection } from "../types/assessment-section"

type SectionInsight = {
  sectionId: string
  sectionName: string
  answered: number
  total: number
  averageScore: number | null
  completed: boolean
}

export type AssessmentInsights = {
  completedSections: number
  pendingSections: number
  averageScore: number | null
  sections: SectionInsight[]
}

export function calculateAssessmentInsights(
  sections: AssessmentSection[],
  questionsBySection: Map<string, AssessmentQuestion[]>,
  answers: AssessmentAnswer[]
): AssessmentInsights {
  const answerMap = new Map(
    answers.map((answer) => [
      answer.assessment_question_id,
      answer.score,
    ])
  )

  const sectionInsights = sections.map((section) => {
    const questions =
      questionsBySection.get(section.id) ?? []

    const scores = questions
      .map((question) => answerMap.get(question.id))
      .filter(
        (score): score is number => score !== undefined
      )

    const averageScore =
      scores.length === 0
        ? null
        : Number(
            (
              scores.reduce((sum, score) => sum + score, 0) /
              scores.length
            ).toFixed(1)
          )

    return {
      sectionId: section.id,
      sectionName: section.name,
      answered: scores.length,
      total: questions.length,
      averageScore,
      completed:
        questions.length > 0 &&
        scores.length === questions.length,
    }
  })

  const completedSections = sectionInsights.filter(
    (section) => section.completed
  ).length

  const pendingSections =
    sectionInsights.length - completedSections

  const allScores = sectionInsights
    .flatMap((section) =>
      section.averageScore === null
        ? []
        : [section.averageScore]
    )

  const averageScore =
    allScores.length === 0
      ? null
      : Number(
          (
            allScores.reduce((sum, score) => sum + score, 0) /
            allScores.length
          ).toFixed(1)
        )

  return {
    completedSections,
    pendingSections,
    averageScore,
    sections: sectionInsights,
  }
}
