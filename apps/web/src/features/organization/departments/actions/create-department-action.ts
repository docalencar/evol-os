"use server"

import { revalidatePath } from "next/cache"

import {
  createDepartment,
  isValidSubmissionId,
  PeopleOrganizationMutationError,
  submissionIdFromInput,
} from "@/features/people-organization-mutations"

import { createDepartmentSchema } from "../schemas/department-schema"

type CreateDepartmentActionState = {
  success: boolean
  message: string
}

export async function createDepartmentAction(
  companyId: string,
  input: unknown
): Promise<CreateDepartmentActionState> {
  const parsedInput = createDepartmentSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para criar departamento.",
    }
  }

  const submissionId = submissionIdFromInput(input)
  if (!isValidSubmissionId(submissionId)) {
    return {
      success: false,
      message: "Dados inválidos para criar departamento.",
    }
  }

  let departmentId: string | undefined
  try {
    const result = await createDepartment(
      companyId,
      parsedInput.data,
      submissionId
    )
    departmentId = result.departmentId
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao criar departamento.",
    }
  }

  revalidatePath("/app/company")
  revalidatePath("/app/company/departments")
  if (departmentId) {
    revalidatePath(`/app/company/departments/${departmentId}`)
  }

  return {
    success: true,
    message: "Departamento criado com sucesso.",
  }
}
