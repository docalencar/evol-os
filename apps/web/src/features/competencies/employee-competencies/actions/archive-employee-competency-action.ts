"use server"

import {
  revalidatePath,
} from "next/cache"

import {
  failureResult,
  successResult,
} from "@/lib/actions"

import {
  createEmployeeCompetencyRepository,
} from "../repositories/employee-competency-repository"

export async function archiveEmployeeCompetencyAction(
  companyId: string,
  employeeId: string,
  employeeCompetencyId: string
) {
  try {
    const repository =
      await createEmployeeCompetencyRepository()

    const { error } =
      await repository.archive(
        companyId,
        employeeCompetencyId
      )

    if (error) {
      return failureResult(
        "Não foi possível arquivar a competência do colaborador."
      )
    }

    revalidatePath(
      `/app/people/${employeeId}`
    )

    revalidatePath(
      "/app/people"
    )

    return successResult(
      "Competência do colaborador arquivada com sucesso."
    )
  } catch (error) {
    return failureResult(
      error instanceof Error
        ? error.message
        : "Não foi possível arquivar a competência do colaborador."
    )
  }
}