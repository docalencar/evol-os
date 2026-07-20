import { getEmployees } from "../../queries/get-employees"
import type { PeopleSummary } from "../types/people-summary"

export async function getPeopleSummary(
  companyId: string,
): Promise<PeopleSummary> {
  const employees = await getEmployees(companyId)

  return {
    total: employees.length,

    active: employees.filter(
      (employee) => employee.status === "active",
    ).length,

    inactive: employees.filter(
      (employee) => employee.status === "inactive",
    ).length,
  }
}
