import type { OrganizationPlanningWorkspace } from "../domain/organization-planning-workspace"
import type { PlanningScenario } from "../domain/planning-scenario"
import type { PublishedSnapshot } from "../domain/published-snapshot"
import type { PlanningDomainEvent } from "../events/planning-domain-event"

type PlanningEventSources = {
  workspace?: OrganizationPlanningWorkspace
  scenario?: PlanningScenario
  snapshot?: PublishedSnapshot
}

export class PlanningDomainEventCollector {
  collect({
    scenario,
    snapshot,
  }: PlanningEventSources): PlanningDomainEvent[] {
    return [
      ...(scenario?.domainEvents ?? []),
      ...(snapshot?.domainEvents ?? []),
    ]
  }
}
