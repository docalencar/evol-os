import type { AssessmentScoredResult } from "@/features/assessment-feedback-read"

export type AssessmentResultMode = "administrative" | "evaluatee" | "evaluator"

export type AssessmentResultQuestionViewModel = Readonly<{
  id: string
  sectionId: string
  prompt: string
  type: AssessmentScoredResult["questions"][number]["type"]
  answerLabel: string
  normalizedScore: number | null
  normalizedScoreLabel: string | null
  scaleLabel: string | null
  competencyLabel: string | null
}>

export type AssessmentResultViewModel = Readonly<{
  responseId: string
  mode: AssessmentResultMode
  statusLabel: string
  submittedAtLabel: string | null
  perspective: Readonly<{
    key: AssessmentScoredResult["perspective"]
    label: string
  }>
  visibility: AssessmentScoredResult["visibility"]
  formulaVersion: AssessmentScoredResult["formulaVersion"]
  score: Readonly<{
    value: number | null
    label: string
  }>
  sections: ReadonlyArray<Readonly<{
    id: string
    name: string
    score: number | null
    scoreLabel: string
    weight: number
    weightLabel: string
  }>>
  competencies: ReadonlyArray<Readonly<{
    id: string
    name: string
    score: number
    scoreLabel: string
  }>>
  questions: ReadonlyArray<AssessmentResultQuestionViewModel>
  qualitativeEvidence: ReadonlyArray<Readonly<{
    id: string
    answerLabel: string
  }>>
  hasQuantitativeResult: boolean
}>
