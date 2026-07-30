import type { ProjectedDepartment } from "../../projection"
import type { PlanningKPIProvider, PlanningKPISource } from "../contracts"
import { activeCount, PLANNING_KPI_KEYS, result } from "./provider-support"

export class OrganizationProvider implements PlanningKPIProvider {
  readonly keys = Object.freeze([
    PLANNING_KPI_KEYS.departments, PLANNING_KPI_KEYS.teams,
    PLANNING_KPI_KEYS.positions, PLANNING_KPI_KEYS.spanOfControl,
    PLANNING_KPI_KEYS.organizationalLayers,
  ])

  calculate(source: PlanningKPISource) {
    const organization = source.planned
    const managers = new Set(organization.departments
      .filter((department) => department.status !== "archived" && department.parentDepartmentId)
      .map((department) => department.parentDepartmentId)).size
    const headcount = activeCount(organization.employees)
    return Object.freeze([
      result(this.keys[0], activeCount(organization.departments)),
      result(this.keys[1], activeCount(organization.teams)),
      result(this.keys[2], activeCount(organization.positions)),
      result(this.keys[3], managers === 0 ? 0 : headcount / managers),
      result(this.keys[4], maximumDepartmentDepth(organization.departments)),
    ])
  }
}

function maximumDepartmentDepth(departments: readonly ProjectedDepartment[]): number {
  const active = departments.filter((item) => item.status !== "archived")
  const byId = new Map(active.map((item) => [item.id, item]))
  let maximum = 0
  for (const department of active) {
    let depth = 1
    let parentId = department.parentDepartmentId
    const visited = new Set([department.id])
    while (parentId && !visited.has(parentId)) {
      visited.add(parentId)
      const parent = byId.get(parentId)
      if (!parent) break
      depth += 1
      parentId = parent.parentDepartmentId
    }
    maximum = Math.max(maximum, depth)
  }
  return maximum
}
