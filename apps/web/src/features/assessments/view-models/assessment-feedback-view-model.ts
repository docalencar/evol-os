export type AssessmentFeedbackCompetency = {
  sectionId: string
  sectionName: string
  averageScore: number
}

export type AssessmentFeedbackViewModel = {
  overallScore: number
  strongestCompetency: AssessmentFeedbackCompetency | null
  weakestCompetency: AssessmentFeedbackCompetency | null
  competencies: AssessmentFeedbackCompetency[]
}
