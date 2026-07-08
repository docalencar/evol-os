import { createEmployeeRepository } from "../repositories/employee-repository"

export async function getEmployees(companyId: string) {
  const employeeRepository = await createEmployeeRepository()

  const { data, error } = await employeeRepository.findAllByCompany(companyId)

  if (error) {
  console.error("Erro Supabase getEmployees:", error)
  throw new Error(error.message)
}

  return data
}
