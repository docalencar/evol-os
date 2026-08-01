import type {
  OrganizationPlanningWorkspace,
  PlanningScenario,
} from "@/features/organization-planning"

import type {
  ExecutiveContextProvider,
  ExecutiveContextProviderResult,
} from "./executive-context-provider"

export type PlanningWorkspaceSource = Readonly<{
  list(
    companyId: string,
  ): Promise<readonly OrganizationPlanningWorkspace[]>
}>

export type PlanningScenarioSource = Readonly<{
  list(
    companyId: string,
  ): Promise<readonly PlanningScenario[]>
}>

export class PlanningExecutiveContextProvider
  implements ExecutiveContextProvider
{
  constructor(
    private readonly companyId: string,
    private readonly workspaces: PlanningWorkspaceSource,
    private readonly scenarios: PlanningScenarioSource,
  ) {}

  async load(): Promise<ExecutiveContextProviderResult> {
    const [
      workspaceResult,
      scenarioResult,
    ] = await Promise.allSettled([
      this.workspaces.list(this.companyId),
      this.scenarios.list(this.companyId),
    ])

    const workspaces =
      workspaceResult.status === "fulfilled"
        ? workspaceResult.value
        : []

    const scenarios =
      scenarioResult.status === "fulfilled"
        ? scenarioResult.value
        : []

    const workspaceId =
      resolveWorkspaceId(workspaces)

    return Object.freeze({
      companyId: this.companyId,
      workspaceId,
      scenarioId: resolveScenarioId(
        scenarios,
        workspaceId,
      ),
    })
  }
}

function resolveWorkspaceId(
  workspaces: readonly OrganizationPlanningWorkspace[],
): string | null {
  if (workspaces.length !== 1) {
    return null
  }

  return workspaces[0]?.id ?? null
}

function resolveScenarioId(
  scenarios: readonly PlanningScenario[],
  workspaceId: string | null,
): string | null {
  if (!workspaceId) {
    return null
  }

  const workspaceScenarios = scenarios.filter(
    (scenario) =>
      scenario.workspaceId === workspaceId,
  )

  if (workspaceScenarios.length !== 1) {
    return null
  }

  return workspaceScenarios[0]?.id ?? null
}
