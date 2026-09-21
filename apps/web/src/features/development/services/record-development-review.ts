import { createDevelopmentReviewRepository } from "../repositories/development-review-repository"

export async function recordDevelopmentReview(
  companyId: string,
  planId: string,
  input: { type: "periodic" | "final"; summary: string; nextStep?: string; idempotencyKey: string }
) {
  const repository = await createDevelopmentReviewRepository()
  const result = await repository.record(companyId, planId, input)
  if (result.error || !result.data) throw new Error("Não foi possível registrar a revisão.")
  return result.data
}
