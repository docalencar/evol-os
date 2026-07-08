import { createRoleRepository } from "../repositories/role-repository"

export async function getRoles(companyId: string) {
  const roleRepository = await createRoleRepository()

  const { data, error } = await roleRepository.findAllByCompany(companyId)

  if (error) {
    throw new Error("Erro ao buscar cargos.")
  }

  return data
}