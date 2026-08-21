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
  executeOrganizationSyncPlan,
  OrganizationSyncExecutionError,
} from "@/features/organization/sync/server"
import {
  isValidSubmissionId,
} from "@/features/people-organization-mutations/submission-id"
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

function failureResult(
  message: string,
  totalItems: number
): ApplyOrganizationSyncPlanActionResult {
  return {
    success: false,
    message,
    totalItems,
    appliedItems: 0,
    skippedItems: 0,
    failedItems: 0,
    errors: [],
  }
}

export async function applyOrganizationSyncPlanAction(
  input: SerializedOrganizationSyncPlan,
  executionId: string
): Promise<ApplyOrganizationSyncPlanActionResult> {
  const plan = deserializePlan(input)

  // The execution_id is the stable identity of ONE Apply intent. A retry of the
  // same intent must reuse it (idempotent at the DB boundary); a new plan gets a
  // new one. If it is missing/malformed we fail closed rather than inventing a
  // second identity.
  if (!isValidSubmissionId(executionId)) {
    return failureResult(
      "Não foi possível iniciar a aplicação. Refaça a análise e tente novamente.",
      plan.items.length
    )
  }

  const { companyId } = await getCurrentCompanyContext()

  let report
  try {
    report = await executeOrganizationSyncPlan({
      companyId,
      executionId,
      plan,
    })
  } catch (error) {
    if (error instanceof OrganizationSyncExecutionError) {
      // Whole-execution refusal (auth / tenant / changed-intent conflict).
      return failureResult(error.message, plan.items.length)
    }
    throw error
  }

  revalidatePath("/app")
  revalidatePath("/app/people")
  revalidatePath("/app/company/departments")
  revalidatePath("/app/company/teams")
  revalidatePath("/app/company/positions")

  return presentApplyOrganizationSyncResult(report)
}
