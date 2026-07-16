"use server"

import { revalidatePath } from "next/cache"

import {
  presentApplyOrganizationSyncResult,
} from "@/features/organization/sync"
import type {
  ApplyOrganizationSyncPlanActionResult,
  OrganizationSyncPlan,
} from "@/features/organization/sync"
import {
  applyOrganizationSyncCoordinator,
  persistOrganizationTimeline,
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

export type {
  ApplyOrganizationSyncPlanActionResult,
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
  const { companyId, user } =
    await getCurrentCompanyContext()

  const plan = deserializePlan(input)

  const executionReport =
    await applyOrganizationSyncCoordinator({
      companyId,
      plan,
    })

  await persistOrganizationTimeline({
    companyId,
    createdBy: user.id,
    report: executionReport,
  })

  revalidatePath("/app")
  revalidatePath("/app/people")
  revalidatePath("/app/company/departments")
  revalidatePath("/app/company/teams")
  revalidatePath("/app/company/positions")

  return presentApplyOrganizationSyncResult(
    executionReport
  )
}
