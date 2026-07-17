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
  getTeamById,
  presentTeamDetails,
  TeamEditDialog,
} from "@/features/organization/teams"

import {
  EntityTimelineSection,
  getEntityTimeline,
  type ActivityTimelineItemViewModel,
} from "@/features/timeline"

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
    teamTimeline,
  ] = await Promise.all([
    getTeamById(
      companyId,
      teamId
    ),

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

  const viewModel =
    presentTeamDetails(team)

  return (
    <div className="space-y-8">
      <PageHeader
        title={viewModel.name}
        description={
          viewModel.description
        }
        actions={
          <TeamEditDialog
            companyId={companyId}
            team={team}
          />
        }
      />

      <DashboardSection
        title="Visão geral"
        description="Informações principais e situação atual do time."
      >
        <DashboardCard>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoCard
              label="Nome"
              value={viewModel.name}
            />

            <InfoCard
              label="Liderança"
              value={
                viewModel
                  .leadershipStatusLabel
              }
            />

            <InfoCard
              label="Estrutura"
              value={
                viewModel
                  .parentTeamStatusLabel
              }
            />

            <InfoCard
              label="Situação"
              value={
                viewModel.statusLabel
              }
            />

            <InfoCard
              label="Criado em"
              value={
                viewModel.createdAtLabel
              }
            />

            <InfoCard
              label="Última atualização"
              value={
                viewModel.updatedAtLabel
              }
            />
          </div>
        </DashboardCard>
      </DashboardSection>

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
