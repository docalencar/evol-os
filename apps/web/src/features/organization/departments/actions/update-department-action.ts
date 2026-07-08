"use server"

import { revalidatePath } from "next/cache"

import { createDepartmentRepository } from "../repositories/department-repository"
import { createDepartmentSchema } from "../schemas/department-schema"

type UpdateDepartmentActionState = {
  success: boolean
  message: string
}

export async function updateDepartmentAction(
  companyId: string,
  departmentId: string,
  input: unknown
): Promise<UpdateDepartmentActionState> {
  const parsedInput = createDepartmentSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para atualizar departamento.",
    }
  }

  const departmentRepository = await createDepartmentRepository()

  const { error } = await departmentRepository.update({
    companyId,
    departmentId,
    name: parsedInput.data.name,
    description: parsedInput.data.description || null,
    leaderId: parsedInput.data.leaderId || null,
  })

  if (error) {
    return {
      success: false,
      message: "Erro ao atualizar departamento.",
    }
  }

  revalidatePath("/app/company")

  return {
    success: true,
    message: "Departamento atualizado com sucesso.",
  }
}
