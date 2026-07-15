import type {
  Employee,
} from "../../types/employee"
import type {
  PeopleWorkspaceSummaryViewModel,
} from "../view-models/people-workspace-summary-view-model"

export function presentPeopleWorkspaceSummary(
  employees: Employee[]
): PeopleWorkspaceSummaryViewModel {
  return employees.reduce<PeopleWorkspaceSummaryViewModel>(
    (summary, employee) => {
      summary.totalEmployees += 1

      switch (employee.status) {
        case "active":
          summary.activeEmployees += 1
          break

        case "on_leave":
          summary.onLeaveEmployees += 1
          break

        case "inactive":
          summary.inactiveEmployees += 1
          break

        case "terminated":
          summary.terminatedEmployees += 1
          break
      }

      return summary
    },
    {
      totalEmployees: 0,
      activeEmployees: 0,
      onLeaveEmployees: 0,
      inactiveEmployees: 0,
      terminatedEmployees: 0,
    }
  )
}
