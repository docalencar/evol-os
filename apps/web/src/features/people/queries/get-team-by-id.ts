import { createTeamRepository } from "../repositories/team-repository"

export async function getTeamById(companyId: string, teamId: string) {
  const teamRepository = await createTeamRepository()

  const { data, error } = await teamRepository.findById(companyId, teamId)

  if (error) {
    throw new Error("Erro ao buscar time.")
  }

  return data
}
