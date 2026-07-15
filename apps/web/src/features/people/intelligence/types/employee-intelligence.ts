export type EmployeeProfileSummary = {
  employeeId: string
  fullName: string
  position: string | null
  department: string | null
}

export type EmployeeAssessmentSummary = {
  completedAssessments: number
  averageScore: number | null
  latestAssessmentAt: string | null
}

export type EmployeeDevelopmentSummary = {
  activePlans: number
  completedPlans: number
}

export type EmployeeCompetencySummary = {
  strongestCompetency: string | null
  weakestCompetency: string | null
}

export type EmployeeTimelineSummary = {
  latestAssessmentAt: string | null
}

export type EmployeeInsightSummary = {
  strengths: string[]
  opportunities: string[]
  nextActions: string[]
}

export type EmployeeIntelligence = {
  profile: EmployeeProfileSummary
  assessments: EmployeeAssessmentSummary
  development: EmployeeDevelopmentSummary
  competencies: EmployeeCompetencySummary
  timeline: EmployeeTimelineSummary
  insights: EmployeeInsightSummary
}
