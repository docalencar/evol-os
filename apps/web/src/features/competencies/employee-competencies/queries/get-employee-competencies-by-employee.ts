import { createEmployeeCompetencyRepository } from "../repositories/employee-competency-repository"

export async function getEmployeeCompetenciesByEmployee(
  companyId: string,
  employeeId: string
) {
  const repository = await createEmployeeCompetencyRepository()

  const { data, error } = await repository.findByEmployee(
    companyId,
    employeeId
  )

  if (error) {
    throw error
  }

  return data
}
