import {
  compareDepartments,
} from "../compare/compare-departments"

import {
  compareTeams,
} from "../compare/compare-teams"

import {
  comparePositions,
} from "../compare/compare-positions"

import {
  compareEmployees,
} from "../compare/compare-employees"

import type {
  OrganizationSnapshot,
} from "../../types/organization-snapshot"

import type {
  OrganizationSyncPlan,
} from "../../types/organization-sync-plan"

export function createOrganizationSyncPlan(
  current: OrganizationSnapshot,
  desired: OrganizationSnapshot
): OrganizationSyncPlan {
  const departments = compareDepartments(
    current.departments,
    desired.departments
  )

  const teams = compareTeams(
    current.teams,
    desired.teams
  )

  const positions = comparePositions(
    current.positions,
    desired.positions
  )

  const employees = compareEmployees(
    current.employees,
    desired.employees
  )

  const items = [
    ...departments,
    ...teams,
    ...positions,
    ...employees,
  ]

  const summary = {
    creates: items.filter(
      (item) => item.operation === "create"
    ).length,

    updates: 0,

    moves: 0,

    archives: items.filter(
      (item) => item.operation === "missing"
    ).length,

    restores: 0,

    unchanged: items.filter(
      (item) => item.operation === "unchanged"
    ).length,

    conflicts: 0,
  }

  return {
    generatedAt: new Date(),
    summary,
    items: items as never,
  }
}
