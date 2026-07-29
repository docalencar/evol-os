"use server"

import { revalidatePath } from "next/cache"

import type { ActionResult } from "@/lib/actions"
import {
  failureResult,
  successResult,
} from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import {
  createWorkspaceCommandSchema,
  type WorkspaceDTO,
} from "../application"
import { createServerPlanningApplication } from "../server"

export type CreateWorkspaceActionInput = Readonly<{
  workspaceId: string
  initialSnapshotId: string
}>

export async function createWorkspaceAction(
  input: CreateWorkspaceActionInput
): Promise<ActionResult<WorkspaceDTO | void>> {
  try {
    const { companyId } = await getCurrentCompanyContext()
    const command = createWorkspaceCommandSchema.safeParse({
      ...input,
      companyId,
      occurredAt: new Date(),
    })

    if (!command.success) {
      return failureResult(
        command.error.issues[0]?.message ??
          "Dados inválidos para criar o workspace."
      )
    }

    const application = await createServerPlanningApplication()
    const workspace = await application.createWorkspace.execute(
      command.data
    )

    revalidatePath("/app/organization")

    return successResult(
      "Workspace criado com sucesso.",
      workspace
    )
  } catch (error) {
    console.error("Erro ao criar workspace de planejamento:", error)

    return failureResult(
      error instanceof Error
        ? error.message
        : "Não foi possível criar o workspace."
    )
  }
}
