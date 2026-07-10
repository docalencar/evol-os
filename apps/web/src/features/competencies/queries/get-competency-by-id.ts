import { createCompetencyRepository } from "../repositories/competency-repository"

export async function getCompetencyById(
  companyId: string,
  competencyId: string
) {
  const repository = await createCompetencyRepository()

  const { data, error } = await repository.findById(companyId, competencyId)

  if (error) {
    throw new Error("Erro ao buscar competência.")
  }

  return data
}
