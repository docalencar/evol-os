import type { Employee } from "../../types/employee"
import type { EmployeeIntelligence } from "../types/employee-intelligence"

type EmployeeIntelligenceSource = Employee & {
  positions?: {
    name: string
  } | null
}

export function createEmployeeIntelligence(
  employee: EmployeeIntelligenceSource
): EmployeeIntelligence {

  return {

    profile: {
      employeeId: employee.id,
      fullName: employee.full_name,
      position: employee.positions?.name ?? null,
      department: null,
    },

    assessments: {
      completedAssessments: 0,
      averageScore: null,
      latestAssessmentAt: null,
    },

    development: {
      activePlans: 0,
      completedPlans: 0,
    },

    competencies: {
      strongestCompetency: null,
      weakestCompetency: null,
    },

    timeline: {
      latestAssessmentAt: null,
    },

    insights: {
      strengths: [],
      opportunities: [],
      nextActions: [],
    },

  }

}
