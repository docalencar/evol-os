"use server"

import { revalidatePath } from "next/cache"

import {
  updatePerson,
  PeopleOrganizationMutationError,
} from "@/features/people-organization-mutations"

import { overwriteEmployeeSchema } from "../schemas/employee-schema"

type UpdateEmployeeActionState = {
  success: boolean
  message: string
}

export async function updateEmployeeAction(
  companyId: string,
  employeeId: string,
  input: unknown
): Promise<UpdateEmployeeActionState> {
  const parsedInput = overwriteEmployeeSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para atualizar colaborador.",
    }
  }

  try {
    // Trusted boundary performs the full update and its activity event atomically.
    await updatePerson(companyId, employeeId, parsedInput.data)
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao atualizar colaborador.",
    }
  }

  revalidatePath("/app/people")
  revalidatePath(`/app/people/${employeeId}`)

  return {
    success: true,
    message: "Colaborador atualizado com sucesso.",
  }
}
