"use server"

import { revalidatePath } from "next/cache"

import { createDepartmentRepository } from "../repositories/department-repository"

export async function archiveDepartmentAction(
  companyId: string,
  departmentId: string
) {
  const repository = await createDepartmentRepository()

  const { error } = await repository.archive(companyId, departmentId)

  if (error) {
    return {
      success: false,
      message: "Erro ao arquivar departamento.",
    }
  }

  revalidatePath("/app/company")

  return {
    success: true,
    message: "Departamento arquivado com sucesso.",
  }
}
