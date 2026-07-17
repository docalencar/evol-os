"use server"

import { revalidatePath } from "next/cache"

import { recordActivity } from "@/features/activity"

import { createDepartmentRepository } from "../repositories/department-repository"
import { createDepartmentSchema } from "../schemas/department-schema"

type CreateDepartmentActionState = {
  success: boolean
  message: string
}

export async function createDepartmentAction(
  companyId: string,
  input: unknown
): Promise<CreateDepartmentActionState> {
  const parsedInput =
    createDepartmentSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        "Dados inválidos para criar departamento.",
    }
  }

  const departmentRepository =
    await createDepartmentRepository()

  const { data, error } =
    await departmentRepository.create({
      companyId,
      name: parsedInput.data.name,
      description:
        parsedInput.data.description || null,
      leaderId:
        parsedInput.data.leaderId || null,
    })

  if (error || !data) {
    console.error(
      "Erro Supabase createDepartment:",
      error
    )

    return {
      success: false,
      message:
        error?.message ??
        "Erro ao criar departamento.",
    }
  }

  try {
    await recordActivity({
      companyId,
      activityType: "department.created",
      module: "organization",
      title: "Departamento criado",
      description: `O departamento ${data.name} foi criado.`,
      actorType: "user",
      entityType: "department",
      entityId: data.id,
      visibility: "company",
      metadata: {
        departmentId: data.id,
        departmentName: data.name,
      },
    })
  } catch (activityError) {
    console.error(
      "Erro ao registrar atividade de criação do departamento:",
      activityError
    )
  }

  revalidatePath("/app/company")
  revalidatePath(
    `/app/company/departments/${data.id}`
  )

  return {
    success: true,
    message:
      "Departamento criado com sucesso.",
  }
}
