import {
  getOrganizationalUnits,
} from "../../units"

import {
  getDepartments,
} from "../../departments"

import {
  getTeams,
} from "../../teams"

import {
  getPositions,
} from "../../positions"

import type {
  OrganizationTreeNode,
} from "../types/organization-tree"


export async function getOrganizationTree(
  companyId: string
): Promise<OrganizationTreeNode[]> {

  const [
    units,
    departments,
    teams,
    positions,
  ] = await Promise.all([
    getOrganizationalUnits(companyId),
    getDepartments(companyId),
    getTeams(companyId),
    getPositions(companyId),
  ])


  const unitNodes: OrganizationTreeNode[] =
    units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      type: "unit",
      children: [],
    }))


  const departmentNodes: OrganizationTreeNode[] =
    departments.map((department) => ({
      id: department.id,
      name: department.name,
      type: "department",
      children: [],
    }))


  const teamNodes: OrganizationTreeNode[] =
    teams.map((team) => ({
      id: team.id,
      name: team.name,
      type: "team",
      children: [],
    }))


  const positionNodes: OrganizationTreeNode[] =
    positions.map((position) => ({
      id: position.id,
      name: position.name,
      type: "position",
      metadata: {
        hierarchicalLevel:
          position.hierarchical_level,
      },
      children: [],
    }))


  const departmentsById =
    new Map(
      departmentNodes.map(
        (item) => [item.id, item]
      )
    )


  const teamsById =
    new Map(
      teamNodes.map(
        (item) => [item.id, item]
      )
    )


  const positionsByDepartment =
    new Map<string, OrganizationTreeNode[]>()


  positions.forEach((position) => {
    if (!position.department_id) {
      return
    }

    const list =
      positionsByDepartment.get(
        position.department_id
      ) ?? []

    list.push(
      positionNodes.find(
        (item) =>
          item.id === position.id
      )!
    )

    positionsByDepartment.set(
      position.department_id,
      list
    )
  })


  teams.forEach((team) => {

    if (!team.departmentId) {
      return
    }

    const department =
      departmentsById.get(
        team.departmentId
      )

    if (!department) {
      return
    }

    department.children.push(
      teamsById.get(team.id)!
    )
  })


  departments.forEach((department) => {

    const node =
      departmentsById.get(
        department.id
      )

    if (!node) {
      return
    }

    node.children.push(
      ...(positionsByDepartment.get(
        department.id
      ) ?? [])
    )

  })


  const departmentsByUnit =
    new Map<string, OrganizationTreeNode[]>()


  departments.forEach((department) => {

    if (!department.organization_unit_id) {
      return
    }

    const list =
      departmentsByUnit.get(
        department.organization_unit_id
      ) ?? []

    list.push(
      departmentsById.get(
        department.id
      )!
    )

    departmentsByUnit.set(
      department.organization_unit_id,
      list
    )
  })


  const orphanDepartments =
  departments
    .filter(
      (department) =>
        !department.organization_unit_id
    )
    .map(
      (department) =>
        departmentsById.get(
          department.id
        )!
    )


return [
  {
    id: "unassigned",
    name: "Sem unidade organizacional",
    type: "unit",
    children: orphanDepartments,
  },

  ...unitNodes.map((unit) => ({
    ...unit,
    children:
      departmentsByUnit.get(unit.id) ?? [],
  })),
]
}
