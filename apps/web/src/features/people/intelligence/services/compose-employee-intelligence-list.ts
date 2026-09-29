import type { CompanyAssessmentSummary } from "@/features/assessments"
import type { Competency } from "@/features/competencies"
import type { CanonicalPersonCompetencyCoverage } from "@/features/competencies/person-competency-gaps"
import type { DevelopmentPlan } from "@/features/development"

import { presentPersonCompetencyCoverage } from "../../competencies"
import type { Employee } from "../../types/employee"
import { createEmployeeIntelligence } from "../queries/create-employee-intelligence"
import type { EmployeeIntelligence } from "../types/employee-intelligence"

type EmployeeIntelligenceDevelopmentPlan = Pick<
  DevelopmentPlan,
  "employeeId" | "title" | "status" | "priority" | "dueDate"
>

export type EmployeeIntelligenceBatchFacts = Readonly<{
  employees: readonly Employee[]
  competencies: readonly Competency[]
  developmentPlans: readonly EmployeeIntelligenceDevelopmentPlan[]
  assessmentSummaries: readonly CompanyAssessmentSummary[]
  competencyCoverages: readonly CanonicalPersonCompetencyCoverage[]
}>

export function composeEmployeeIntelligenceList(
  facts: EmployeeIntelligenceBatchFacts,
  currentDate: Date = new Date()
): EmployeeIntelligence[] {
  const plansByEmployee = new Map<string, EmployeeIntelligenceDevelopmentPlan[]>()
  for (const plan of facts.developmentPlans) {
    const plans = plansByEmployee.get(plan.employeeId) ?? []
    plans.push(plan)
    plansByEmployee.set(plan.employeeId, plans)
  }

  const assessmentsByEmployee = new Map(
    facts.assessmentSummaries.map((summary) => [summary.employeeId, summary])
  )
  const coveragesByEmployee = new Map(
    facts.competencyCoverages.map((coverage) => [coverage.personId, coverage])
  )

  return facts.employees.map((employee) => {
    const assessment = assessmentsByEmployee.get(employee.id)
    const coverage = coveragesByEmployee.get(employee.id)
    const assessedCompetencies = coverage?.competencies.filter(
      (competency) => competency.currentLevel !== null
    ) ?? []
    const competencyGaps = coverage
      ? presentPersonCompetencyCoverage(coverage).legacyTalentCoverage.gaps
      : []

    return createEmployeeIntelligence(employee, {
      assessments: {
        completedAssessments: assessment?.completedAssessments ?? 0,
        pendingAssessments: assessment?.pendingAssessments ?? 0,
        averageScore: null,
        latestAssessmentAt: assessment?.latestCompletedAt ?? null,
      },
      developmentPlans: plansByEmployee.get(employee.id) ?? [],
      employeeCompetencies: assessedCompetencies.map((competency) => ({
        competency_id: competency.competencyId,
        current_level: competency.currentLevel as number,
        archived_at: null,
      })),
      competencies: facts.competencies,
      competencyGaps: [...competencyGaps],
    }, currentDate)
  })
}
