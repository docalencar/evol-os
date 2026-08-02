import { readAssessmentAdministratively } from "../application/assessment-administrative-read-service"
import {
  summarizeEmployeeAssessments,
  type EmployeeAssessmentSummary,
} from "../services/summarize-employee-assessments"

export {
  summarizeEmployeeAssessments,
  type EmployeeAssessmentSummary,
} from "../services/summarize-employee-assessments"

export async function getEmployeeAssessmentSummary(
  companyId: string,
  employeeId: string
): Promise<EmployeeAssessmentSummary> {
  const result = await readAssessmentAdministratively(
    companyId,
    "employee",
    employeeId,
    "view_employee_assessment_summary"
  )

  return summarizeEmployeeAssessments(
    result.responses,
    result.answers
  )
}
