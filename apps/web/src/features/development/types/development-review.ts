export type DevelopmentReview = {
  id: string
  planId: string
  reviewerId: string
  type: "periodic" | "final"
  reviewedAt: string
  summary: string
  nextStep: string | null
  createdAt: string
}
