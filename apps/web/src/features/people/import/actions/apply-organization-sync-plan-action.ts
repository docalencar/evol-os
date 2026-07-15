"use server"

import { revalidatePath } from "next/cache"

import type {
  OrganizationSyncPlan,
} from "@/features/organization/sync"
import {
  applyOrganizationSyncCoordinator,
} from "@/features/organization/sync/server"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

export type SerializedOrganizationSyncPlan = Omit<
  OrganizationSyncPlan,
  "generatedAt"
> & {
  generatedAt: string
}

export type ApplyOrganizationSyncPlanActionResult = {
  success: boolean
  message: string
  totalItems: number
  appliedItems: number
  skippedItems: number
  failedItems: number
  errors: Array<{
    itemId: string
    entity: string
    operation: string
    message: string
  }>
}

function deserializePlan(
  input: SerializedOrganizationSyncPlan
): OrganizationSyncPlan {
  return {
    ...input,
    generatedAt: new Date(input.generatedAt),
  }
}

export async function applyOrganizationSyncPlanAction(
  input: SerializedOrganizationSyncPlan
): Promise<ApplyOrganizationSyncPlanActionResult> {
  const { companyId } =
    await getCurrentCompanyContext()

  const plan = deserializePlan(input)

  const result =
    await applyOrganizationSyncCoordinator({
      companyId,
      plan,
    })

  revalidatePath("/app")
  revalidatePath("/app/people")
  revalidatePath("/app/company/departments")
  revalidatePath("/app/company/teams")
  revalidatePath("/app/company/positions")

  return {
    success: result.success,
    message:
      result.failedItems === 0
        ? `${result.appliedItems} item${
            result.appliedItems === 1 ? "" : "ns"
          } aplicado${
            result.appliedItems === 1 ? "" : "s"
          } com sucesso.`
        : `${result.appliedItems} item${
            result.appliedItems === 1 ? "" : "ns"
          } aplicado${
            result.appliedItems === 1 ? "" : "s"
          } e ${result.failedItems} com erro.`,
    totalItems: result.totalItems,
    appliedItems: result.appliedItems,
    skippedItems: result.skippedItems,
    failedItems: result.failedItems,
    errors: result.errors,
  }
}
