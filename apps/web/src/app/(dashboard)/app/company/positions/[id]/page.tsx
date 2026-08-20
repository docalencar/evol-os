import Link from "next/link"
import { redirect } from "next/navigation"

import { ArrowLeft } from "lucide-react"
import { z } from "zod"

import { DashboardSection } from "@/components/dashboard"
import { PageHeader } from "@/components/shared/page-header"
import {
  getManagementCompetencies,
  getManagementDepartments,
  getManagementEntityTimeline,
  getManagementPeople,
  getManagementPositionCompetencies,
  getManagementPositionRequirements,
  getManagementPositions,
} from "@/features/dashboard-read"
import {
  PositionRequirementCreateDialog,
  PositionRequirementsTable,
  type PositionRequirement,
} from "@/features/organization/position-requirements"
import {
  PositionCompetenciesCard,
  PositionEditDialog,
  PositionWorkspaceOverview,
  presentPositionWorkspace,
} from "@/features/organization/positions"
import {
  PositionSenioritiesSection,
  getPositionSeniorities,
} from "@/features/organization/position-seniorities"
import { type Employee } from "@/features/people"
import {
  EntityTimelineSection,
  createActivityIntelligenceAIContext,
  presentActivityIntelligence,
  type ActivityTimelineItemViewModel,
} from "@/features/timeline"

import { createExecutiveAiContext } from "@/features/copilot/context"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

function formatTimelineDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date))
}

function formatTimelineLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function presentPositionTimelineItem(
  item: ActivityTimelineItemViewModel
) {
  const actorLabels = {
    user: "Usuário",
    system: "Sistema",
    automation: "Automação",
    integration: "Integração",
  } satisfies Record<
    ActivityTimelineItemViewModel["actorType"],
    string
  >

  return {
    title: item.title,
    description: item.description,
    actorLabel: actorLabels[item.actorType],
    occurredAtLabel: formatTimelineDate(item.occurredAt),
    moduleLabel: formatTimelineLabel(item.module),
    activityTypeLabel: formatTimelineLabel(
      item.activityType
    ),
  }
}

type PositionDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function PositionDetailsPage({
  params,
}: PositionDetailsPageProps) {
  const { id } = await params

  const positionIdResult = z.string().uuid().safeParse(id)

  if (!positionIdResult.success) {
    redirect("/app/company/positions")
  }

  const positionId = positionIdResult.data

  const { companyId } = await getCurrentCompanyContext()

  const [
    position,
    positionCompetencies,
    competencies,
    positionRequirementsData,
    employeesData,
    departments,
    positionTimeline,
    positionSeniorities,
  ] = await Promise.all([
    getManagementPositions(companyId).then(
      (rows) =>
        rows.find((row) => row.id === positionId) ?? null
    ),
    getManagementPositionCompetencies(
      companyId,
      positionId
    ),
    getManagementCompetencies(companyId),
    getManagementPositionRequirements(
      companyId,
      positionId
    ),
    getManagementPeople(companyId),
    getManagementDepartments(companyId),
    getManagementEntityTimeline(
      companyId,
      "position",
      positionId,
      20
    ),
    getPositionSeniorities(companyId, positionId),
  ])

  if (!position) {
    redirect("/app/company/positions")
  }

  const departmentOptions = (departments ?? []).map(
    (department) => ({
      id: department.id,
      name: department.name,
    })
  )

  const positionDepartment =
    departmentOptions.find(
      (department) =>
        department.id === position.department_id
    ) ?? null

  const employees = (employeesData ?? []) as Employee[]

  const positionRequirements = (positionRequirementsData ??
    []) as PositionRequirement[]

  const workspace = presentPositionWorkspace({
    position,
    department: positionDepartment,
    employees,
    competencyCount: positionCompetencies?.length ?? 0,
    requirementCount: positionRequirements.length,
  })

  const activityIntelligence = presentActivityIntelligence({
    activities: positionTimeline.items,
  })

  const activityAiContext =
    createActivityIntelligenceAIContext({
      intelligence: activityIntelligence,
    })

  const executiveAiContext = createExecutiveAiContext({
    entityType: "position",
    entityId: position.id,
    companyId,
    title: workspace.name,
    metrics: workspace.metrics.map((metric) => ({
      id: metric.id,
      label: metric.label,
      value: metric.value,
    })),
    metadata: {
      departmentId: workspace.context.departmentId ?? "",
      hierarchicalLevel:
        workspace.context.hierarchicalLevelLabel,
      status: workspace.context.statusLabel,
    },
    activity: activityAiContext,
  })

  void executiveAiContext

  return (
    <div className="space-y-8">
      <Link
        href="/app/company/positions"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para cargos
      </Link>

      <PageHeader
        title={workspace.name}
        description={workspace.description}
        actions={
          <PositionEditDialog
            companyId={companyId}
            departments={departmentOptions}
            position={position}
          />
        }
      />

      <PositionWorkspaceOverview workspace={workspace} />

      <PositionCompetenciesCard
        companyId={companyId}
        positionId={position.id}
        competencies={competencies ?? []}
        positionCompetencies={positionCompetencies ?? []}
      />

      <DashboardSection
        title="Requisitos técnicos"
        description="Defina formação, experiência, certificações, idiomas e conhecimentos necessários para este cargo."
        actions={
          <PositionRequirementCreateDialog
            positionId={position.id}
          />
        }
      >
        <PositionRequirementsTable
          requirements={positionRequirements}
        />
      </DashboardSection>

      <PositionSenioritiesSection
        positionId={position.id}
        applicable={positionSeniorities.applicable}
        available={positionSeniorities.available}
      />

      <DashboardSection
        title="Histórico do cargo"
        description="Acompanhe alterações estruturais, vínculos e demais acontecimentos relacionados a este cargo."
      >
        <EntityTimelineSection
          title="Atividades recentes"
          description="Registro cronológico das movimentações do cargo."
          emptyTitle="Nenhuma atividade registrada"
          emptyDescription="As alterações e movimentações deste cargo aparecerão aqui."
          items={positionTimeline.items.map(
            presentPositionTimelineItem
          )}
        />
      </DashboardSection>
    </div>
  )
}
