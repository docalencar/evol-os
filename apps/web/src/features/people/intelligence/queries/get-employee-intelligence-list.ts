import { getEmployees } from "../../queries/get-employees"
import { createEmployeeIntelligence } from "./create-employee-intelligence"

export async function getEmployeeIntelligenceList(
  companyId: string
) {
  const employees = await getEmployees(companyId)

  return employees.map((employee) =>
    createEmployeeIntelligence(employee)
  )
}
