"use server"

import { z } from "zod"

import type { ActionResult } from "@/lib/actions"
import { successResult } from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"
import { AuthorizationService, PERMISSION_CATALOG } from "@/features/authorization"

import type { PublicationValidationResult } from "../application"
import { createServerPlanningApplication } from "../server"

const inputSchema = z.object({
  scenarioId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
})

export async function validatePublicationAction(
  input: z.input<typeof inputSchema>
): Promise<ActionResult<PublicationValidationResult>> {
  try {
    const parsed = inputSchema.safeParse(input)
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos para validar a publicação." }
    }
    const { companyId, currentUser } = await getCurrentCompanyContext()
    await new AuthorizationService(currentUser).requirePermission(PERMISSION_CATALOG.ORGANIZATION_PLANNING_PUBLISH, companyId)
    const application = await createServerPlanningApplication(currentUser)
    const validation = await application.validatePublication.execute({ ...parsed.data, companyId })
    return successResult(
      validation.valid ? "Cenário pronto para publicação." : "O cenário possui impedimentos para publicação.",
      validation
    )
  } catch (error) {
    console.error("Erro ao validar publicação do cenário:", error)
    return { success: false, message: "Não foi possível validar a publicação." }
  }
}
