"use server"

import {
  createOrganizationDryRunReport,
} from "../engine/dry-run"
import {
  presentOrganizationDryRun,
} from "../presenters/present-organization-dry-run"
import type {
  OrganizationSyncPlan,
} from "../types/organization-sync-plan"
import type {
  OrganizationDryRunViewModel,
} from "../view-models/organization-dry-run-view-model"

export type SerializedOrganizationDryRunPlan = Omit<
  OrganizationSyncPlan,
  "generatedAt"
> & {
  generatedAt: string
}

function deserializePlan(
  input: SerializedOrganizationDryRunPlan
): OrganizationSyncPlan {
  return {
    ...input,
    generatedAt: new Date(input.generatedAt),
  }
}

export async function createOrganizationDryRunAction(
  input: SerializedOrganizationDryRunPlan
): Promise<OrganizationDryRunViewModel> {
  const plan = deserializePlan(input)

  const report =
    createOrganizationDryRunReport(plan)

  return presentOrganizationDryRun(report)
}
