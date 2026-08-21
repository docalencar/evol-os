import { redirect } from "next/navigation"

import {
  DashboardSection,
  InfoCard,
} from "@/components/dashboard"
import { EntityBackLink } from "@/components/shared/entity-back-link"

import { getEmployeeAssessmentSummary } from "@/features/assessments"
import {
  getManagementCompetencies,
  getManagementCompetencyAssignments,
  getManagementDepartments,
  getManagementDevelopmentPlans,
  getManagementEmployeeCompetencies,
  getManagementEntityTimeline,
  getManagementPeople,
  getManagementPersonIncludingTerminated,
  getManagementPositions,
  getManagementTeams,
} from "@/features/dashboard-read"

import {
  EmployeeCompetenciesCard,
} from "@/features/competencies/employee-competencies"

import {
  DevelopmentPlanAiSuggestionDialog,
  getDevelopmentPlanAiContext,
} from "@/features/development"

import {
  createEmployeeIntelligence,
  presentEmployeeIntelligence,
  EmployeeAssessmentsSummaryCard,
  EmployeeCompetenciesSummaryCard,
  EmployeeDevelopmentSummaryCard,
  EmployeeNextActionsCard,
  getPeopleSeniorityOptions,
  presentEmployeeWorkspace,
  type Employee,
} from "@/features/people"

import {
  EmployeeProfileHeader,
  EmployeeProfileLayout,
  EmployeeProfileSidebar,
  EmployeeProfileStats,
  EmployeeProfileTimeline,
} from "@/features/people/profile"

import {
  CompetencyGapCard,
  createEmployeeInsights,
  deriveCompetencyCoverage,
  TalentSummaryCard,
} from "@/features/talent"

import {
  ActivityIntelligenceCard,
  createActivityIntelligenceAIContext,
  presentActivityIntelligence,
} from "@/features/timeline"

import { createExecutiveAiContext } from "@/features/copilot/context"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type Relation =
  | {
      name: string
    }
  | {
      name: string
    }[]
  | null

type NamedEntity = {
  id: string
  name: string
}

function getRelationName(relation?: Relation) {
  if (!relation) {
    return null
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name ?? null
  }

  return relation.name || null
}

type EmployeeProfilePageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EmployeeProfilePage({
  params,
}: EmployeeProfilePageProps) {
  const { id } = await params

  const { companyId } = await getCurrentCompanyContext()

  const [
    employee,
    employeeCompetencies,
    competencies,
    competencyAssignments,
    teams,
    positions,
    employees,
    employeeTimeline,
    assessmentSummary,
    allDevelopmentPlans,
    departments,
  ] = await Promise.all([
    getManagementPersonIncludingTerminated(companyId, id),

    getManagementEmployeeCompetencies(companyId, id),

    getManagementCompetencies(companyId),

    getManagementCompetencyAssignments(companyId),

    getManagementTeams(companyId),
    getManagementPositions(companyId),
    getManagementPeople(companyId),
    getManagementEntityTimeline(
      companyId,
      "person",
      id,
      20
    ),

    getEmployeeAssessmentSummary(companyId, id),

    getManagementDevelopmentPlans(companyId),

    getManagementDepartments(companyId),
  ])

  if (!employee) {
    redirect("/app/people")
  }

  // Development plans and competency gaps are derived from tenant-safe read
  // models only: filter plans to this employee, and compute gaps from the
  // subject's position requirements (competency directory) versus the
  // employee's current levels, reusing the existing gap business rule.
  const developmentPlans = allDevelopmentPlans.filter(
    (plan) => plan.employeeId === id
  )

  const competencyCoverage = deriveCompetencyCoverage({
    positionId: employee.position_id,
    expectations: competencyAssignments
      .filter(
        (assignment) =>
          assignment.record_type === "position" &&
          assignment.position_id === employee.position_id
      )
      .map((assignment) => ({
        competencyId: assignment.competency_id,
        competencyName: assignment.competency_name,
        expectedLevel: assignment.expected_level as number,
        weight: assignment.weight as number,
        required: assignment.required as boolean,
      })),
    employeeLevels: employeeCompetencies.map((competency) => ({
      competencyId: competency.competency_id,
      currentLevel: competency.current_level,
    })),
  })
  const competencyGaps = [...competencyCoverage.gaps]

  const teamOptions = ((teams ?? []) as NamedEntity[]).map(
    (team) => ({
      id: team.id,
      name: team.name,
    })
  )

  const positionOptions = (
    (positions ?? []) as NamedEntity[]
  ).map((position) => ({
    id: position.id,
    name: position.name,
  }))

  const seniorityOptionsByPosition =
    await getPeopleSeniorityOptions(
      companyId,
      positionOptions.map((position) => position.id)
    )

  const managerOptions = (
    (employees ?? []) as Employee[]
  ).map((manager) => ({
    id: manager.id,
    name: manager.full_name,
  }))

  const managerName =
    managerOptions.find(
      (manager) => manager.id === employee.manager_id
    )?.name ?? null

  // Department is derived from the canonical Position → Department relationship
  // (position.department_id), resolved to a name via the trusted departments
  // read. No direct department-table access and no string inference.
  const departmentIdByPosition = new Map(
    ((positions ?? []) as Array<{
      id: string
      department_id: string | null
    }>).map((position) => [
      position.id,
      position.department_id,
    ])
  )

  const departmentNameById = new Map(
    ((departments ?? []) as Array<{
      id: string
      name: string
    }>).map((department) => [
      department.id,
      department.name,
    ])
  )

  const employeeDepartmentId = employee.position_id
    ? departmentIdByPosition.get(employee.position_id) ?? null
    : null

  const departmentName = employeeDepartmentId
    ? departmentNameById.get(employeeDepartmentId) ?? null
    : null

  const workspace = presentEmployeeWorkspace({
    employee,
    departmentName,
    positionName: getRelationName(employee.positions),
    teamName: getRelationName(employee.teams),
    managerName,
    teams: teamOptions,
    positions: positionOptions,
    managers: managerOptions,
  })

  const insights = createEmployeeInsights(competencyGaps)

  const employeeIntelligence = presentEmployeeIntelligence(
    createEmployeeIntelligence(employee, {
      assessments: assessmentSummary,
      developmentPlans,
      employeeCompetencies: employeeCompetencies ?? [],
      competencies,
      competencyGaps,
    })
  )

  const developmentPlanAiContext =
    getDevelopmentPlanAiContext({
      employeeName: workspace.employeeName,

      positionName: workspace.organization.positionLabel,

      competencyGaps,
    })

  const canGenerateAiSuggestion =
    workspace.hasPosition &&
    developmentPlanAiContext.competencyGaps.length > 0

  const activityIntelligence = presentActivityIntelligence({
    activities: employeeTimeline.items,
  })

  const activityAiContext =
    createActivityIntelligenceAIContext({
      intelligence: activityIntelligence,
    })

  const executiveAiContext = createExecutiveAiContext({
    entityType: "employee",
    entityId: workspace.id,
    companyId,
    title: workspace.employeeName,
    metrics: workspace.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      value: metric.value,
    })),
    metadata: {
      positionId: workspace.organization.positionId ?? "",
      teamId: workspace.organization.teamId ?? "",
      managerId: employee.manager_id ?? "",
    },
    activity: activityAiContext,
  })

  void executiveAiContext

  return (
    <div className="space-y-8">
      <EntityBackLink
        href="/app/people"
        label="Voltar para pessoas"
      />

      <EmployeeProfileLayout
        sidebar={
          <EmployeeProfileSidebar
            organization={workspace.organization}
            personId={id}
          />
        }
      header={
        <EmployeeProfileHeader
          seniorityOptionsByPosition={
            seniorityOptionsByPosition
          }
          companyId={workspace.companyId}
          employee={employee}
          header={workspace.header}
          options={workspace.options}
        />
      }
      summary={
        <EmployeeProfileStats metrics={workspace.metrics} />
      }
    >
      <DashboardSection title="Resumo de talentos">
        <TalentSummaryCard
          insights={insights}
          coverage={competencyCoverage}
          positionId={workspace.organization.positionId}
        />
      </DashboardSection>

      <DashboardSection title="Acompanhamento do colaborador">
        <div className="grid gap-4 xl:grid-cols-2">
          <EmployeeAssessmentsSummaryCard
            {...employeeIntelligence.assessments}
          />
          <EmployeeDevelopmentSummaryCard
            {...employeeIntelligence.development}
          />
          <EmployeeCompetenciesSummaryCard
            {...employeeIntelligence.competencies}
          />
          <EmployeeNextActionsCard
            actions={
              employeeIntelligence.insights.nextActions
            }
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Informações principais">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard
            label="E-mail"
            value={
              <span className="break-all">
                {workspace.contact.emailLabel}
              </span>
            }
          />

          <InfoCard
            label="Telefone"
            value={workspace.contact.phoneLabel}
          />

          <InfoCard
            label="DISC"
            value={workspace.contact.discProfileLabel}
          />
        </div>
      </DashboardSection>

      <DashboardSection
        title="Gap de competências"
        actions={
          canGenerateAiSuggestion ? (
            <DevelopmentPlanAiSuggestionDialog
              input={developmentPlanAiContext}
            />
          ) : undefined
        }
      >
        <CompetencyGapCard coverage={competencyCoverage} />
      </DashboardSection>

      <DashboardSection title="Competências registradas">
        <EmployeeCompetenciesCard
          companyId={workspace.companyId}
          employeeId={workspace.id}
          competencies={competencies}
          employeeCompetencies={employeeCompetencies ?? []}
        />
      </DashboardSection>

      <ActivityIntelligenceCard
        intelligence={activityIntelligence}
      />

      <EmployeeProfileTimeline
        hireDate={employee.hire_date}
        items={employeeTimeline.items}
      />
      </EmployeeProfileLayout>
    </div>
  )
}
