export type ScenarioComparisonSummary = Readonly<{
  departmentsCreated: number
  departmentsUpdated: number
  departmentsArchived: number

  teamsCreated: number
  teamsUpdated: number
  teamsArchived: number

  positionsCreated: number
  positionsUpdated: number
  positionsMoved: number
  positionsArchived: number

  employeesCreated: number
  employeesUpdated: number
  employeesMoved: number
  employeesTerminated: number
  employeesArchived: number
}>
