import {
  createDepartmentRepository,
} from "../../departments"
import {
  createPositionRepository,
} from "../repositories/position-repository"
import {
  createPositionSchema,
} from "../schemas/position-schema"

import type {
  OrganizationSyncItem,
} from "../../sync"

export type ApplyPositionSyncItemInput = {
  companyId: string
  item: OrganizationSyncItem
}

export type ApplyPositionSyncItemResult = {
  success: boolean
  message: string
  positionId?: string
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

export async function applyPositionSyncItem({
  companyId,
  item,
}: ApplyPositionSyncItemInput): Promise<ApplyPositionSyncItemResult> {
  if (item.entity !== "position") {
    return {
      success: false,
      message:
        "O item informado não pertence ao domínio de cargos.",
    }
  }

  if (item.operation !== "create") {
    return {
      success: false,
      message:
        `A operação "${item.operation}" ainda não é suportada para cargos.`,
    }
  }

  const desired =
    item.desired &&
    typeof item.desired === "object"
      ? item.desired
      : null

  const name =
    desired && "name" in desired
      ? String(desired.name ?? "").trim()
      : ""

  const departmentName =
    desired && "department" in desired
      ? String(desired.department ?? "").trim()
      : ""

  let departmentId: string | null = null

  if (departmentName) {
    const departmentRepository =
      await createDepartmentRepository()

    const { data: departments, error } =
      await departmentRepository.findAllByCompany(
        companyId
      )

    if (error) {
      return {
        success: false,
        message:
          `Não foi possível localizar o departamento do cargo: ${error.message}`,
      }
    }

    departmentId =
      departments?.find(
        (department) =>
          normalize(department.name) ===
          normalize(departmentName)
      )?.id ?? null

    if (!departmentId) {
      return {
        success: false,
        message:
          `O departamento "${departmentName}" não foi encontrado para o cargo "${name}".`,
      }
    }
  }

  const parsedInput = createPositionSchema.safeParse({
    name,
    description: null,
    departmentId,
    hierarchicalLevel: "analyst",
    status: "active",
    weeklyWorkloadHours: 44,
    workModel: "on_site",
    employmentType: "clt",
    travelRequirement: "none",
  })

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        parsedInput.error.issues[0]?.message ??
        "Os dados do novo cargo são inválidos.",
    }
  }

  const repository =
    await createPositionRepository()

  const { data, error } = await repository.create({
    companyId,
    name: parsedInput.data.name,
    description:
      parsedInput.data.description ?? null,
    departmentId:
      parsedInput.data.departmentId ?? null,
    hierarchicalLevel:
      parsedInput.data.hierarchicalLevel,
    status:
      parsedInput.data.status,
    weeklyWorkloadHours:
      parsedInput.data.weeklyWorkloadHours,
    workModel:
      parsedInput.data.workModel,
    employmentType:
      parsedInput.data.employmentType,
    travelRequirement:
      parsedInput.data.travelRequirement,
  })

  if (error) {
    return {
      success: false,
      message:
        `Não foi possível criar o cargo: ${error.message}`,
    }
  }

  return {
    success: true,
    message:
      `Cargo "${data.name}" criado com sucesso.`,
    positionId: data.id,
  }
}
