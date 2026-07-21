export type FeedbackAiTone =
  | "positive"
  | "constructive"
  | "neutral"
  | "attention"

export type FeedbackAiAnalysis = {
  summary: string

  tone: FeedbackAiTone

  themes: string[]

  competencies: string[]

  agreements: string[]

  nextSteps: string[]
}
