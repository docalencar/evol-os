import { createEmployeeRepository } from "../repositories/employee-repository"

export async function getEmployeeById(companyId: string, employeeId: string) {
  const employeeRepository = await createEmployeeRepository()

  const { data, error } = await employeeRepository.findById(
    companyId,
    employeeId
  )

  if (error) {
    throw new Error("Erro ao buscar colaborador.")
  }

  return data
}
