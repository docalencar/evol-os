import { createCompetencyRepository } from "../repositories/competency-repository"

export async function getCompetencies(companyId: string) {
  const repository = await createCompetencyRepository()

  const { data, error } = await repository.findAllByCompany(companyId)

  if (error) {
    throw new Error("Erro ao buscar competências.")
  }

  return data ?? []
}
