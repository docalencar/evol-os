import { createDevelopmentReviewRepository } from "../repositories/development-review-repository"

export async function getDevelopmentReviewsByPlan(companyId: string, planId: string) {
  const repository = await createDevelopmentReviewRepository()
  const { data, error } = await repository.findByPlan(companyId, planId)
  if (error) throw new Error("Não foi possível carregar o histórico de revisões.")
  return data
}
