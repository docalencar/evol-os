import { createEmployeeRepository } from "../repositories/employee-repository"

export async function getEmployees(companyId: string) {
  const employeeRepository = await createEmployeeRepository()

  const { data, error } = await employeeRepository.findAllByCompany(companyId)

  if (error) {
    throw new Error("Erro ao buscar colaboradores.")
  }

  return data
}
