"use server"

import { revalidatePath } from "next/cache"

import {
  createPerson,
  isValidSubmissionId,
  PeopleOrganizationMutationError,
  submissionIdFromInput,
} from "@/features/people-organization-mutations"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { createEmployeeSchema } from "../schemas/employee-schema"

type CreateEmployeeActionState = {
  success: boolean
  message: string
}

export async function createEmployeeAction(
  input: unknown
): Promise<CreateEmployeeActionState> {
  const parsedInput = createEmployeeSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message: "Dados inválidos para criar colaborador.",
    }
  }

  // A create requires an explicit submission identity (idempotency selector).
  // Reject before any RPC — there is no content-derived fallback.
  const submissionId = submissionIdFromInput(input)
  if (!isValidSubmissionId(submissionId)) {
    return {
      success: false,
      message: "Dados inválidos para criar colaborador.",
    }
  }

  const { companyId } = await getCurrentCompanyContext()

  let personId: string | undefined
  try {
    // The trusted mutation boundary persists the person and its activity event
    // atomically; the application must not write people or activity directly.
    const result = await createPerson(
      companyId,
      parsedInput.data,
      submissionId
    )
    personId = result.personId
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof PeopleOrganizationMutationError
          ? error.message
          : "Erro ao criar colaborador.",
    }
  }

  revalidatePath("/app/people")
  if (personId) {
    revalidatePath(`/app/people/${personId}`)
  }

  return {
    success: true,
    message: "Colaborador criado com sucesso.",
  }
}
