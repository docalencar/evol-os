"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  CreateScenarioHandler,
} from "../application/handlers"
import {
  PlanningDomainEventCollector,
} from "../application/planning-domain-event-collector"
import {
  SimplePlanningUnitOfWork,
} from "../application/transactions"
import {
  createScenarioRepository,
} from "../repositories/scenario-repository"
import {
  createSnapshotRepository,
} from "../repositories/snapshot-repository"
import {
  createWorkspaceRepository,
} from "../repositories/workspace-repository"
import {
  createScenarioActionInputSchema,
  type CreateScenarioActionInput,
} from "../schemas/planning-action-schemas"

export type CreateScenarioActionState =
  | {
      success: true
      message: string
      scenarioId: string
    }
  | {
      success: false
      message: string
    }

function normalizeDescription(
  description: string | null | undefined
) {
  const normalized = description?.trim()

  return normalized ? normalized : null
}

function getScenarioErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Não foi possível criar o cenário."
  }

  const message = error.message.toLowerCase()

  if (message.includes("workspace não encontrado")) {
    return "O workspace de planejamento não foi encontrado."
  }

  if (message.includes("snapshot-base não encontrado")) {
    return "O snapshot-base selecionado não foi encontrado."
  }

  if (
    message.includes(
      "snapshot-base não pertence ao workspace"
    )
  ) {
    return "O snapshot-base não pertence ao workspace informado."
  }

  if (
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) {
    return "Você não tem permissão para criar cenários de planejamento."
  }

  return error.message
}

export async function createScenarioAction(
  input: CreateScenarioActionInput
): Promise<CreateScenarioActionState> {
  const parsed =
    createScenarioActionInputSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Dados inválidos para criar o cenário.",
    }
  }

  try {
    const {
      companyId,
    } = await getCurrentCompanyContext()

    const scenarioId = randomUUID()
    const occurredAt = new Date()

    const [
      workspaceRepository,
      scenarioRepository,
      snapshotRepository,
    ] = await Promise.all([
      createWorkspaceRepository(),
      createScenarioRepository(),
      createSnapshotRepository(),
    ])

    const handler = new CreateScenarioHandler(
      workspaceRepository,
      scenarioRepository,
      snapshotRepository,
      new SimplePlanningUnitOfWork(),
      new PlanningDomainEventCollector()
    )

    await handler.execute({
      companyId,
      scenarioId,
      workspaceId: parsed.data.workspaceId,
      baseSnapshotId: parsed.data.baseSnapshotId,
      name: parsed.data.name,
      description: normalizeDescription(
        parsed.data.description
      ),
      occurredAt,
    })

    revalidatePath("/app/organization")

    return {
      success: true,
      message: "Cenário criado com sucesso.",
      scenarioId,
    }
  } catch (error) {
    console.error(
      "Organization Planning Scenario Create Error:",
      error
    )

    return {
      success: false,
      message: getScenarioErrorMessage(error),
    }
  }
}
