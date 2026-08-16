import { redirect } from "next/navigation"

import {
  DashboardSection,
  InfoCard,
} from "@/components/dashboard"

import { getEmployeeAssessmentSummary } from "@/features/assessments"
import {
  getManagementEntityTimeline,
  getManagementPeople,
  getManagementPerson,
  getManagementPositions,
  getManagementTeams,
} from "@/features/dashboard-read"

import { getCompetencies } from "@/features/competencies"

import {
  EmployeeCompetenciesCard,
  getEmployeeCompetenciesByEmployee,
} from "@/features/competencies/employee-competencies"

import {
  DevelopmentPlanAiSuggestionDialog,
  getDevelopmentPlanAiContext,
  getDevelopmentPlansByEmployee,
} from "@/features/development"

import {
  createEmployeeIntelligence,
  presentEmployeeIntelligence,
  EmployeeAssessmentsSummaryCard,
  EmployeeCompetenciesSummaryCard,
  EmployeeDevelopmentSummaryCard,
  EmployeeNextActionsCard,
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
  getEmployeeCompetencyGaps,
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
    competencyGaps,
    competencies,
    teams,
    positions,
    employees,
    employeeTimeline,
    assessmentSummary,
    developmentPlans,
  ] = await Promise.all([
    getManagementPerson(companyId, id),

    getEmployeeCompetenciesByEmployee(companyId, id),

    getEmployeeCompetencyGaps(companyId, id),

    getCompetencies(companyId),

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

    getDevelopmentPlansByEmployee(companyId, id),
  ])

  if (!employee) {
    redirect("/app/people")
  }

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

  const workspace = presentEmployeeWorkspace({
    employee,
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
    <EmployeeProfileLayout
      sidebar={
        <EmployeeProfileSidebar
          organization={workspace.organization}
        />
      }
      header={
        <EmployeeProfileHeader
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
        <CompetencyGapCard gaps={competencyGaps} />
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
  )
}
