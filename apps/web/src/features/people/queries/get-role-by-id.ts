import { createRoleRepository } from "../repositories/role-repository"

export async function getRoleById(companyId: string, roleId: string) {
  const roleRepository = await createRoleRepository()

  const { data, error } = await roleRepository.findById(companyId, roleId)

  if (error) {
    throw new Error("Erro ao buscar cargo.")
  }

  return data
}