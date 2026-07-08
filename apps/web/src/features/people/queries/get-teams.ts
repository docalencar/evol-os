import { createTeamRepository } from "../repositories/team-repository"

export async function getTeams(companyId: string) {
  const teamRepository = await createTeamRepository()

  const { data, error } = await teamRepository.findAllByCompany(companyId)

  if (error) {
    throw new Error("Erro ao buscar times.")
  }

  return data
}
