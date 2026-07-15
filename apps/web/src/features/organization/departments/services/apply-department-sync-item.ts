import {
  createDepartmentSchema,
} from "../schemas/department-schema"
import {
  createDepartmentRepository,
} from "../repositories/department-repository"

import type {
  OrganizationSyncItem,
} from "../../sync"

export type ApplyDepartmentSyncItemInput = {
  companyId: string
  item: OrganizationSyncItem
}

export type ApplyDepartmentSyncItemResult = {
  success: boolean
  message: string
  departmentId?: string
}

export async function applyDepartmentSyncItem({
  companyId,
  item,
}: ApplyDepartmentSyncItemInput): Promise<ApplyDepartmentSyncItemResult> {
  if (item.entity !== "department") {
    return {
      success: false,
      message:
        "O item informado não pertence ao domínio de departamentos.",
    }
  }

  if (item.operation !== "create") {
    return {
      success: false,
      message:
        `A operação "${item.operation}" ainda não é suportada para departamentos.`,
    }
  }

  const parsedInput = createDepartmentSchema.safeParse(
    item.desired
  )

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        "Os dados do novo departamento são inválidos.",
    }
  }

  const repository =
    await createDepartmentRepository()

  const { data, error } = await repository.create({
    companyId,
    name: parsedInput.data.name,
    description:
      parsedInput.data.description ?? null,
    leaderId:
      parsedInput.data.leaderId ?? null,
  })

  if (error) {
    return {
      success: false,
      message:
        `Não foi possível criar o departamento: ${error.message}`,
    }
  }

  return {
    success: true,
    message:
      `Departamento "${data.name}" criado com sucesso.`,
    departmentId: data.id,
  }
}
