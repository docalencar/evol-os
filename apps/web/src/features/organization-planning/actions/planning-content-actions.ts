"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { AuthorizationService, PERMISSION_CATALOG } from "@/features/authorization"
import type { ActionResult } from "@/lib/actions"
import { successResult } from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import type { PlanningContentReadback } from "../application"
import { createServerPlanningApplication } from "../server"
import { planningActionErrorMessage } from "./planning-action-error"

const nullableText = (maximum: number) =>
  z.string().trim().max(maximum).nullable()

const mutationContextSchema = z.object({
  scenarioId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
})

const departmentContentSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().trim().min(2, "Informe um nome com pelo menos 2 caracteres.").max(120),
  code: nullableText(40),
  description: nullableText(500),
  parentDepartmentId: z.string().uuid().nullable(),
})

const createSchema = mutationContextSchema.extend({
  changeSetId: z.string().uuid(),
  content: departmentContentSchema,
})

const replaceSchema = mutationContextSchema.extend({
  currentChangeSetId: z.string().uuid(),
  replacementChangeSetId: z.string().uuid(),
  content: departmentContentSchema,
})

const removeSchema = mutationContextSchema.extend({
  changeSetId: z.string().uuid(),
})

const reorderSchema = mutationContextSchema.extend({
  orderedChangeSetIds: z.array(z.string().uuid()).min(1),
})

export type CreatePlanningDepartmentInput = z.input<typeof createSchema>
export type ReplacePlanningDepartmentInput = z.input<typeof replaceSchema>
export type RemovePlanningChangeSetActionInput = z.input<typeof removeSchema>
export type ReorderPlanningChangeSetsActionInput = z.input<typeof reorderSchema>

export async function createPlanningDepartmentAction(
  input: CreatePlanningDepartmentInput
): Promise<ActionResult<PlanningContentReadback>> {
  return runContentMutation(createSchema, input, "Departamento adicionado ao cenário.",
    (application, companyId, value) => application.contentEditor.createDepartment({ ...value, companyId }))
}

export async function replacePlanningDepartmentAction(
  input: ReplacePlanningDepartmentInput
): Promise<ActionResult<PlanningContentReadback>> {
  return runContentMutation(replaceSchema, input, "Departamento atualizado no cenário.",
    (application, companyId, value) => application.contentEditor.replaceDepartment({ ...value, companyId }))
}

export async function removePlanningChangeSetAction(
  input: RemovePlanningChangeSetActionInput
): Promise<ActionResult<PlanningContentReadback>> {
  return runContentMutation(removeSchema, input, "Alteração removida do cenário.",
    (application, companyId, value) => application.contentEditor.remove({ ...value, companyId }))
}

export async function reorderPlanningChangeSetsAction(
  input: ReorderPlanningChangeSetsActionInput
): Promise<ActionResult<PlanningContentReadback>> {
  return runContentMutation(reorderSchema, input, "Ordem das alterações atualizada.",
    (application, companyId, value) => application.contentEditor.reorder({ ...value, companyId }))
}

type PlanningApplication = Awaited<ReturnType<typeof createServerPlanningApplication>>

/**
 * Every content mutation is scoped to a scenario and carries the version the
 * caller believes it is editing. Constraining the generic on that shape — rather
 * than on the bare schema — is what lets this helper revalidate the scenario's
 * path and lets the boundary enforce optimistic concurrency; with an unbounded
 * `z.ZodType` the parsed value widens to `unknown` and `scenarioId` disappears.
 */
type ContentMutationValue = Readonly<{ scenarioId: string; expectedVersion: number }>

async function runContentMutation<Value extends ContentMutationValue>(
  schema: z.ZodType<Value>,
  input: unknown,
  successMessage: string,
  mutation: (
    application: PlanningApplication,
    companyId: string,
    value: Value
  ) => Promise<PlanningContentReadback>
): Promise<ActionResult<PlanningContentReadback>> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Dados inválidos para editar o cenário.",
    }
  }

  try {
    const { companyId, currentUser } = await getCurrentCompanyContext()
    await new AuthorizationService(currentUser).requirePermission(
      PERMISSION_CATALOG.ORGANIZATION_PLANNING_MANAGE,
      companyId
    )
    const application = await createServerPlanningApplication(currentUser)
    const readback = await mutation(application, companyId, parsed.data)
    revalidatePath(`/app/organization/planning/${parsed.data.scenarioId}`)
    return successResult(successMessage, readback)
  } catch (error) {
    return { success: false, message: planningActionErrorMessage(error) }
  }
}
