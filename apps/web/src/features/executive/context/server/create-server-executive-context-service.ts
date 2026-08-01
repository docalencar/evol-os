import "server-only"

import { listScenarios } from "@/features/organization-planning/queries/list-scenarios"
import { listWorkspaces } from "@/features/organization-planning/queries/list-workspaces"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  ExecutiveContextService,
  type ExecutiveContextClock,
} from "../application"
import {
  PlanningExecutiveContextProvider,
  type PlanningScenarioSource,
  type PlanningWorkspaceSource,
} from "../providers"

class SystemExecutiveContextClock
  implements ExecutiveContextClock
{
  now(): Date {
    return new Date()
  }
}

const workspaceSource: PlanningWorkspaceSource = {
  list(companyId) {
    return listWorkspaces(companyId)
  },
}

const scenarioSource: PlanningScenarioSource = {
  list(companyId) {
    return listScenarios(companyId)
  },
}

export async function createServerExecutiveContextService(): Promise<ExecutiveContextService> {
  const { companyId } =
    await getCurrentCompanyContext()

  const provider =
    new PlanningExecutiveContextProvider(
      companyId,
      workspaceSource,
      scenarioSource,
    )

  return new ExecutiveContextService(
    provider,
    new SystemExecutiveContextClock(),
  )
}