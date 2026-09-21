"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import { failureResult, successResult } from "@/lib/actions"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { executeDevelopmentAction } from "../services/execute-development-action"
import { recordDevelopmentReview } from "../services/record-development-review"
import { activateDevelopmentPlan, completeDevelopmentPlan } from "../services/transition-development-plan"

const id = z.string().uuid()

function refresh(planId: string) {
  revalidatePath("/app/development")
  revalidatePath(`/app/development/plans/${planId}`)
}

export async function transitionDevelopmentActionAction(input: {
  planId: string
  actionId: string
  transition: "start" | "complete" | "skip"
  reason?: string
}) {
  const parsed = z.object({
    planId: id,
    actionId: id,
    transition: z.enum(["start", "complete", "skip"]),
    reason: z.string().trim().min(1).max(500).optional(),
  }).safeParse(input)
  if (!parsed.success || (parsed.data.transition === "skip" && !parsed.data.reason)) {
    return failureResult("Informe um motivo de até 500 caracteres para ignorar a ação.")
  }
  try {
    const { companyId } = await getCurrentCompanyContext()
    const data = await executeDevelopmentAction(
      companyId, parsed.data.planId, parsed.data.actionId,
      parsed.data.transition, parsed.data.reason
    )
    refresh(parsed.data.planId)
    return successResult("Ação atualizada com sucesso.", data)
  } catch (error) {
    return failureResult(error instanceof Error ? error.message : "Erro ao atualizar a ação.")
  }
}

export async function recordDevelopmentReviewAction(input: {
  planId: string
  type: "periodic" | "final"
  summary: string
  nextStep?: string
  idempotencyKey: string
}) {
  const parsed = z.object({
    planId: id,
    type: z.enum(["periodic", "final"]),
    summary: z.string().trim().min(1).max(4000),
    nextStep: z.string().trim().max(2000).optional(),
    idempotencyKey: id,
  }).refine((value) => value.type === "final" || Boolean(value.nextStep), {
    message: "Próximo passo obrigatório para revisão periódica.",
  }).safeParse(input)
  if (!parsed.success) return failureResult(parsed.error.issues[0]?.message ?? "Revisão inválida.")
  try {
    const { companyId } = await getCurrentCompanyContext()
    const data = await recordDevelopmentReview(companyId, parsed.data.planId, parsed.data)
    refresh(parsed.data.planId)
    return successResult("Revisão registrada com sucesso.", data)
  } catch (error) {
    return failureResult(error instanceof Error ? error.message : "Erro ao registrar a revisão.")
  }
}

export async function transitionDevelopmentPlanAction(input: {
  planId: string
  transition: "activate" | "complete"
}) {
  const parsed = z.object({ planId: id, transition: z.enum(["activate", "complete"]) }).safeParse(input)
  if (!parsed.success) return failureResult("Transição inválida.")
  try {
    const { companyId } = await getCurrentCompanyContext()
    const data = parsed.data.transition === "activate"
      ? await activateDevelopmentPlan(companyId, parsed.data.planId)
      : await completeDevelopmentPlan(companyId, parsed.data.planId)
    refresh(parsed.data.planId)
    return successResult("Plano atualizado com sucesso.", data)
  } catch (error) {
    return failureResult(error instanceof Error ? error.message : "Erro ao atualizar o plano.")
  }
}
