import { createEmployeeCompetencyRepository } from "../repositories/employee-competency-repository"

export async function getEmployeeCompetencies(companyId: string) {
  const repository = await createEmployeeCompetencyRepository()

  const { data, error } = await repository.findAll(companyId)

  if (error) throw error

  return data
}