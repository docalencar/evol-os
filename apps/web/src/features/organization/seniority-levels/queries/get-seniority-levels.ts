import { createSeniorityLevelRepository } from "../repositories/seniority-level-repository"

export async function getSeniorityLevels(companyId: string) {
  const repository = await createSeniorityLevelRepository()

  const { data, error } = await repository.findAllByCompany(companyId)

  if (error) {
    throw new Error("Não foi possível carregar as senioridades.")
  }

  return data ?? []
}
