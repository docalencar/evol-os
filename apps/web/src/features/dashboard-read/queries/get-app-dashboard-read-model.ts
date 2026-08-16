import "server-only"

import { createServerDatabase } from "@/lib/database/server-database"

import { calculateCompetencyGap } from "@/features/talent"
import { createEmployeeInsights } from "@/features/talent/services/create-employee-insights"
import type { DevelopmentPriority } from "@/features/talent"
import type { WorkforceHealth } from "@/features/hr-intelligence"
import type { TalentOverview } from "@/features/hr-intelligence/types/talent-overview"
import type { OrganizationSummary } from "@/features/organization"
import type { JobOpening } from "@/features/recruitment"
import { presentActivityTimeline } from "@/features/timeline/presenters/activity-timeline-presenter"
import type { ActivityTimelineViewModel } from "@/features/timeline/view-models/activity-timeline-item-view-model"

import {
  createTenantDashboardReadRepository,
  type TenantCompetencyDirectoryRow,
  type TenantDashboardReadRows,
} from "../repositories/tenant-dashboard-read-repository"

export type DashboardJobOpening = Pick<
  JobOpening,
  | "id"
  | "title"
  | "status"
  | "priority"
  | "departmentId"
  | "positionId"
  | "requestingManagerId"
  | "recruiterId"
  | "targetHireDate"
  | "updatedAt"
>

export type AppDashboardReadModel = Readonly<{
  health: WorkforceHealth
  talentOverview: TalentOverview
  organization: OrganizationSummary
  developmentPriorities: DevelopmentPriority[]
  jobOpenings: DashboardJobOpening[]
  recruitmentOptions: Readonly<{
    departments: Readonly<{ id: string; name: string }>[]
    positions: Readonly<{
      id: string
      name: string
      departmentId: string | null
      status: "active" | "inactive"
    }>[]
    employees: Readonly<{
      id: string
      fullName: string
      status: "active" | "inactive" | "on_leave"
    }>[]
  }>
  companyTimeline: ActivityTimelineViewModel
  development: Readonly<{
    plans: TenantDashboardReadRows["development"]
    goals: TenantDashboardReadRows["development"]
    actions: TenantDashboardReadRows["development"]
    templates: TenantDashboardReadRows["development"]
  }>
}>

function getEmployeeGaps(
  employeeId: string,
  positionId: string | null,
  competencies: readonly TenantCompetencyDirectoryRow[],
) {
  if (!positionId) return []

  const currentLevelByCompetency = new Map(
    competencies
      .filter((row) => row.record_type === "employee" && row.employee_id === employeeId)
      .map((row) => [row.competency_id, row.current_level ?? 0]),
  )

  return competencies
    .filter((row) => row.record_type === "position" && row.position_id === positionId)
    .map((row) => calculateCompetencyGap({
      competencyId: row.competency_id,
      competencyName: row.competency_name,
      currentLevel: currentLevelByCompetency.get(row.competency_id) ?? 0,
      expectedLevel: row.expected_level ?? 0,
      weight: row.weight ?? 0,
      required: row.required ?? false,
    }))
}

function createDevelopmentPriorities(rows: TenantDashboardReadRows): DevelopmentPriority[] {
  const priorities = rows.people
    .filter((person) => person.status === "active" || person.status === "on_leave")
    .map((person) => {
      const gaps = getEmployeeGaps(person.person_id, person.position_id, rows.competencies)
      const insights = createEmployeeInsights(gaps)

      return {
        employeeId: person.person_id,
        employeeName: person.full_name,
        risk: insights.risk,
        criticalGaps: gaps.filter((gap) => gap.status === "critical").length,
        attentionGaps: gaps.filter((gap) => gap.status === "attention").length,
        biggestGap: insights.biggestGap,
      }
    })

  const riskWeight = { high: 3, medium: 2, low: 1 } as const
  return priorities.sort((left, right) =>
    riskWeight[right.risk] - riskWeight[left.risk]
      || right.criticalGaps - left.criticalGaps,
  )
}

export function presentAppDashboardReadModel(
  companyId: string,
  rows: TenantDashboardReadRows,
): AppDashboardReadModel {
  const departments = rows.organization.filter((row) => row.entity_type === "department")
  const teams = rows.organization.filter((row) => row.entity_type === "team")
  const positions = rows.organization.filter((row) => row.entity_type === "position")
  const employeeCount = rows.people.length

  return Object.freeze({
    health: {
      totalEmployees: employeeCount,
      healthyEmployees: 0,
      attentionEmployees: 0,
      criticalEmployees: employeeCount,
    },
    talentOverview: {
      promotionReady: 0,
      developing: 0,
      attention: employeeCount,
    },
    organization: {
      departments: departments.length,
      positions: positions.length,
      teams: teams.length,
    },
    developmentPriorities: createDevelopmentPriorities(rows),
    jobOpenings: rows.recruitment.map((row) => ({
      id: row.job_opening_id,
      title: row.title,
      status: row.status,
      priority: row.priority,
      departmentId: row.department_id,
      positionId: row.position_id,
      requestingManagerId: row.requesting_manager_id,
      recruiterId: row.recruiter_id,
      targetHireDate: row.target_hire_date,
      updatedAt: row.updated_at,
    })),
    recruitmentOptions: {
      departments: departments.map((row) => ({ id: row.entity_id, name: row.name })),
      positions: positions.map((row) => {
        const status: "active" | "inactive" =
          row.status === "inactive" ? "inactive" : "active"

        return {
          id: row.entity_id,
          name: row.name,
          departmentId: row.department_id,
          status,
        }
      }),
      employees: rows.people.map((row) => ({
        id: row.person_id,
        fullName: row.full_name,
        status: row.status,
      })),
    },
    companyTimeline: presentActivityTimeline(
      rows.activity.map((row) => ({
        id: row.activity_id,
        company_id: companyId,
        activity_type: row.activity_type,
        module: row.module,
        title: row.title,
        description: row.description,
        actor_type: row.actor_type,
        actor_id: row.actor_id,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        subject_type: row.subject_type,
        subject_id: row.subject_id,
        visibility: row.visibility,
        metadata: row.metadata,
        occurred_at: row.occurred_at,
        created_at: row.created_at,
      })),
      20,
    ),
    development: {
      plans: rows.development.filter((row) => row.record_type === "plan"),
      goals: rows.development.filter((row) => row.record_type === "goal"),
      actions: rows.development.filter((row) => row.record_type === "action"),
      templates: rows.development.filter((row) => row.record_type === "template"),
    },
  })
}

export async function getAppDashboardReadModel(companyId: string): Promise<AppDashboardReadModel> {
  const database = await createServerDatabase()
  const repository = createTenantDashboardReadRepository(database)
  const rows = await repository.load(companyId, 20)
  return presentAppDashboardReadModel(companyId, rows)
}
