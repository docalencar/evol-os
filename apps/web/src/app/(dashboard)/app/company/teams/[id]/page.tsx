import { redirect } from "next/navigation"

import { z } from "zod"

import {
  DashboardCard,
  DashboardSection,
  InfoCard,
} from "@/components/dashboard"

import {
  PageHeader,
} from "@/components/shared/page-header"

import {
  getDepartmentById,
} from "@/features/organization/departments"

import {
  getTeamById,
  getTeams,
  presentTeamDetails,
  presentTeamWorkspace,
  TeamEditDialog,
  TeamWorkspaceOverview,
} from "@/features/organization/teams"

import {
  getEmployees,
} from "@/features/people"

import {
  ActivityIntelligenceCard,
  EntityTimelineSection,
  createActivityIntelligenceAIContext,
  getEntityTimeline,
  presentActivityIntelligence,
  type ActivityTimelineItemViewModel,
} from "@/features/timeline"

import {
  createExecutiveAiContext,
} from "@/features/copilot/context"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

type TeamDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

const ACTOR_LABELS = {
  user: "Usuário",
  system: "Sistema",
  automation: "Automação",
  integration: "Integração",
} satisfies Record<
  ActivityTimelineItemViewModel["actorType"],
  string
>

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date))
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    )
}

function presentTeamTimelineItem(
  item: ActivityTimelineItemViewModel
) {
  return {
    title: item.title,
    description: item.description,
    actorLabel:
      ACTOR_LABELS[item.actorType],
    occurredAtLabel:
      formatDate(item.occurredAt),
    moduleLabel:
      formatLabel(item.module),
    activityTypeLabel:
      formatLabel(item.activityType),
  }
}

export default async function TeamDetailsPage({
  params,
}: TeamDetailsPageProps) {
  const { id } = await params

  const teamIdResult =
    z.string().uuid().safeParse(id)

  if (!teamIdResult.success) {
    redirect("/app/company/teams")
  }

  const teamId = teamIdResult.data

  const { companyId } =
    await getCurrentCompanyContext()

  const [
    team,
    teams,
    employees,
    teamTimeline,
  ] = await Promise.all([
    getTeamById(
      companyId,
      teamId
    ),

    getTeams(companyId),

    getEmployees(companyId),

    getEntityTimeline({
      companyId,
      entityType: "team",
      entityId: teamId,
      limit: 20,
    }),
  ])

  if (!team) {
    redirect("/app/company/teams")
  }

  const department =
    team.department_id
      ? await getDepartmentById(
          companyId,
          team.department_id
        )
      : null

  const parentTeam =
    team.parent_team_id
      ? (teams ?? []).find(
          (candidateTeam) =>
            candidateTeam.id ===
            team.parent_team_id
        ) ?? null
      : null

  const details =
    presentTeamDetails(team)

  const workspace =
    presentTeamWorkspace({
      teamId,
      leaderId:
        team.manager_id ?? null,
      childTeamsCount:
        (teams ?? []).filter(
          (candidateTeam) =>
            candidateTeam.parent_team_id ===
            teamId
        ).length,
      departmentName:
        department?.name ?? null,
      parentTeamName:
        parentTeam?.name ?? null,
      employees: employees ?? [],
    })


  const activityIntelligence =
    presentActivityIntelligence({
      activities:
        teamTimeline.items,
    })

  const activityAiContext =
    createActivityIntelligenceAIContext({
      intelligence:
        activityIntelligence,
    })

  const executiveAiContext =
    createExecutiveAiContext({
      entityType: "team",
      entityId: team.id,
      companyId,
      title: team.name,
      metrics: workspace.metrics.map(
        (metric) => ({
          id: metric.id,
          label: metric.label,
          value: String(metric.value),
        })
      ),
      metadata: {
        departmentId:
          team.department_id ?? "",
        parentTeamId:
          team.parent_team_id ?? "",
      },
      activity: activityAiContext,
    })

  void executiveAiContext

  return (
    <div className="space-y-8">
      <PageHeader
        title={details.name}
        description={
          details.description
        }
        actions={
          <TeamEditDialog
            companyId={companyId}
            team={team}
          />
        }
      />

      <TeamWorkspaceOverview
        workspace={workspace}
      />

      <DashboardSection
        title="Informações do time"
        description="Dados estruturais e situação atual."
      >
        <DashboardCard>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoCard
              label="Nome"
              value={details.name}
            />

            <InfoCard
              label="Liderança"
              value={
                details
                  .leadershipStatusLabel
              }
            />

            <InfoCard
              label="Estrutura"
              value={
                details
                  .parentTeamStatusLabel
              }
            />

            <InfoCard
              label="Situação"
              value={
                details.statusLabel
              }
            />

            <InfoCard
              label="Criado em"
              value={
                details.createdAtLabel
              }
            />

            <InfoCard
              label="Última atualização"
              value={
                details.updatedAtLabel
              }
            />
          </div>
        </DashboardCard>
      </DashboardSection>


      <ActivityIntelligenceCard
        intelligence={
          activityIntelligence
        }
      />

      <DashboardSection
        title="Histórico do time"
        description="Acompanhe mudanças estruturais, vínculos e demais acontecimentos relacionados ao time."
      >
        <EntityTimelineSection
          title="Atividades recentes"
          description="Registro cronológico das movimentações do time."
          emptyTitle="Nenhuma atividade registrada"
          emptyDescription="As alterações e movimentações deste time aparecerão aqui."
          items={teamTimeline.items.map(
            presentTeamTimelineItem
          )}
        />
      </DashboardSection>
    </div>
  )
}
