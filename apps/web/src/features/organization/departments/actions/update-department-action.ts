"use server"

import { revalidatePath } from "next/cache"

import {
  updateDepartment,
  PeopleOrganizationMutationError,
} from "@/features/people-organization-mutations"

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

  try {
    await updateDepartment(companyId, departmentId, parsedInput.data)
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao atualizar departamento.",
    }
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/departments")
  revalidatePath(`/app/company/departments/${departmentId}`)

  return {
    success: true,
    message: "Departamento atualizado com sucesso.",
  }
}
