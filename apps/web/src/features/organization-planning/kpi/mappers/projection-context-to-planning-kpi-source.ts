import { createEmptyProjectedOrganization, freezeProjectedOrganization, type ProjectionContext } from "../../projection"
import type { PlanningKPISource } from "../contracts"

export function mapProjectionContextToPlanningKPISource(context: ProjectionContext): PlanningKPISource {
  const current = context.snapshot.organization
    ? freezeProjectedOrganization(context.snapshot.organization)
    : createEmptyProjectedOrganization()
  const planned = freezeProjectedOrganization(context.organization)
  return Object.freeze({
    current, planned,
    departments: planned.departments,
    teams: planned.teams,
    positions: planned.positions,
    employees: planned.employees,
    scenario: Object.freeze({
      scenario: Object.freeze({ ...context.scenario }),
      events: Object.freeze([...context.events]),
    }),
  })
}
