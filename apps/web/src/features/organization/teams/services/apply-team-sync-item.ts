import {
  createTeamRepository,
} from "../repositories/team-repository"
import {
  createTeamSchema,
} from "../schemas/team-schema"

import type {
  OrganizationSyncItem,
} from "../../sync"

export type ApplyTeamSyncItemInput = {
  companyId: string
  item: OrganizationSyncItem
}

export type ApplyTeamSyncItemResult = {
  success: boolean
  message: string
}

export async function applyTeamSyncItem({
  companyId,
  item,
}: ApplyTeamSyncItemInput): Promise<ApplyTeamSyncItemResult> {
  if (item.entity !== "team") {
    return {
      success: false,
      message:
        "O item informado não pertence ao domínio de times.",
    }
  }

  if (item.operation !== "create") {
    return {
      success: false,
      message:
        `A operação "${item.operation}" ainda não é suportada para times.`,
    }
  }

  const desired =
    item.desired &&
    typeof item.desired === "object"
      ? item.desired
      : null

  const parsedInput = createTeamSchema.safeParse({
    name:
      desired && "name" in desired
        ? desired.name
        : undefined,
    description: null,
    parentTeamId: null,
    leaderId: null,
  })

  if (!parsedInput.success) {
    return {
      success: false,
      message:
        "Os dados do novo time são inválidos.",
    }
  }

  const repository =
    await createTeamRepository()

  const { error } = await repository.create({
    companyId,
    name: parsedInput.data.name,
    description:
      parsedInput.data.description ?? null,
    parentTeamId:
      parsedInput.data.parentTeamId ?? null,
    leaderId:
      parsedInput.data.leaderId ?? null,
  })

  if (error) {
    return {
      success: false,
      message:
        `Não foi possível criar o time: ${error.message}`,
    }
  }

  return {
    success: true,
    message:
      `Time "${parsedInput.data.name}" criado com sucesso.`,
  }
}
