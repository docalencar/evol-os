import type {
  OrganizationComparison,
} from "../types/organization-comparison"



type OrganizationEntity = {
  id: string
}



type OrganizationStructure = {
  departments: readonly OrganizationEntity[]
  teams: readonly OrganizationEntity[]
  positions: readonly OrganizationEntity[]
  employees: readonly OrganizationEntity[]
}



export function compareOrganizations(
  current: OrganizationStructure,
  projected: OrganizationStructure
): OrganizationComparison {


  const departments =
    compareCollection(
      current.departments,
      projected.departments
    )


  const teams =
    compareCollection(
      current.teams,
      projected.teams
    )


  const positions =
    compareCollection(
      current.positions,
      projected.positions
    )


  const employees =
    compareCollection(
      current.employees,
      projected.employees
    )


  return {

    departments,

    teams,

    positions,

    employees,

    totalChanges:
      departments.created +
      departments.updated +
      departments.removed +
      teams.created +
      teams.updated +
      teams.removed +
      positions.created +
      positions.updated +
      positions.removed +
      employees.created +
      employees.updated +
      employees.removed,

  }

}



function compareCollection(
  current: readonly OrganizationEntity[],
  projected: readonly OrganizationEntity[]
) {

  const currentIds =
    new Set(
      current.map(
        item => item.id
      )
    )


  const projectedIds =
    new Set(
      projected.map(
        item => item.id
      )
    )


  return {

    created:
      projected.filter(
        item => !currentIds.has(item.id)
      ).length,


    updated:
      0,


    removed:
      current.filter(
        item => !projectedIds.has(item.id)
      ).length,

  }

}
