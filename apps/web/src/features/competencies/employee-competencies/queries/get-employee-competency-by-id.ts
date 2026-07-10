import { createEmployeeCompetencyRepository } from "../repositories/employee-competency-repository"

export async function getEmployeeCompetencyById(
  companyId: string,
  id: string
) {
  const repository = await createEmployeeCompetencyRepository()

  const { data, error } = await repository.findById(companyId, id)

  if (error) throw error

  return data
}
