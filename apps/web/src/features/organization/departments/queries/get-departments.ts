import { createDepartmentRepository } from "../repositories/department-repository"

export async function getDepartments(companyId: string) {
  const departmentRepository = await createDepartmentRepository()

  const { data, error } = await departmentRepository.findAllByCompany(companyId)

  if (error) {
    throw new Error("Erro ao buscar departamentos.")
  }

  return data
}
