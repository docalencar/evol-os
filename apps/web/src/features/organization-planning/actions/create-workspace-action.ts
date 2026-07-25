"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  CreateWorkspaceHandler,
} from "../application/handlers"
import {
  InMemorySnapshotVersionAllocator,
} from "../application/ports"
import {
  PlanningDomainEventCollector,
} from "../application/planning-domain-event-collector"
import {
  SimplePlanningUnitOfWork,
} from "../application/transactions"
import {
  createSnapshotRepository,
} from "../repositories/snapshot-repository"
import {
  createWorkspaceRepository,
} from "../repositories/workspace-repository"

export type CreateWorkspaceActionState =
  | {
      success: true
      message: string
      workspaceId: string
      initialSnapshotId: string
    }
  | {
      success: false
      message: string
    }

function getWorkspaceErrorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "Não foi possível iniciar o planejamento organizacional."
  }

  const message = error.message.toLowerCase()

  if (
    message.includes(
      "organization_planning_workspaces_company_key"
    ) ||
    message.includes("duplicate key") ||
    message.includes("unique constraint")
  ) {
    return "O planejamento organizacional desta empresa já foi iniciado."
  }

  if (
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) {
    return "Você não tem permissão para iniciar o planejamento organizacional."
  }

  return error.message
}

export async function createWorkspaceAction():
  Promise<CreateWorkspaceActionState> {
  try {
    const {
      companyId,
    } = await getCurrentCompanyContext()

    const workspaceId = randomUUID()
    const initialSnapshotId = randomUUID()
    const occurredAt = new Date()

    const [
      workspaceRepository,
      snapshotRepository,
    ] = await Promise.all([
      createWorkspaceRepository(),
      createSnapshotRepository(),
    ])

    const handler = new CreateWorkspaceHandler(
      workspaceRepository,
      snapshotRepository,
      new InMemorySnapshotVersionAllocator(),
      new SimplePlanningUnitOfWork(),
      new PlanningDomainEventCollector()
    )

    await handler.execute({
      companyId,
      workspaceId,
      initialSnapshotId,
      occurredAt,
    })

    revalidatePath("/app/organization")

    return {
      success: true,
      message:
        "Planejamento organizacional iniciado com sucesso.",
      workspaceId,
      initialSnapshotId,
    }
  } catch (error) {
    console.error(
      "Organization Planning Workspace Create Error:",
      error
    )

    return {
      success: false,
      message: getWorkspaceErrorMessage(error),
    }
  }
}
