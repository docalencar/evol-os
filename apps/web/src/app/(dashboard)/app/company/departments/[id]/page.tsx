import Link from "next/link"
import { redirect } from "next/navigation"

import { z } from "zod"

import {
  DashboardCard,
  DashboardSection,
  InfoCard,
} from "@/components/dashboard"

import { PageHeader } from "@/components/shared/page-header"

import {
  DepartmentEditDialog,
  getDepartmentById,
} from "@/features/organization/departments"

import { getPositions } from "@/features/organization/positions/queries/get-positions"
import { getTeams } from "@/features/organization/teams/queries/get-teams"
import { getEmployees } from "@/features/people/queries/get-employees"

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

type DepartmentDetailsPageProps = {
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

function presentDepartmentTimelineItem(
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

function belongsToDepartment(
  item: unknown,
  departmentId: string
) {
  if (
    !item ||
    typeof item !== "object"
  ) {
    return false
  }

  const record =
    item as Record<string, unknown>

  return (
    record.department_id === departmentId ||
    record.departmentId === departmentId
  )
}

type ManagementCardProps = {
  title: string
  description: string
  href: string
}

function ManagementCard({
  title,
  description,
  href,
}: ManagementCardProps) {
  return (
    <DashboardCard>
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">
            {title}
          </h3>

          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        <Link
          href={href}
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Gerenciar
        </Link>
      </div>
    </DashboardCard>
  )
}

export default async function DepartmentDetailsPage({
  params,
}: DepartmentDetailsPageProps) {
  const { id } = await params

  const departmentIdResult =
    z.string().uuid().safeParse(id)

  if (!departmentIdResult.success) {
    redirect("/app/company/departments")
  }

  const departmentId =
    departmentIdResult.data

  const { companyId } =
    await getCurrentCompanyContext()

  const [
    department,
    teams,
    positions,
    employees,
    departmentTimeline,
  ] = await Promise.all([
    getDepartmentById(
      companyId,
      departmentId
    ),

    getTeams(companyId),

    getPositions(companyId),

    getEmployees(companyId),

    getEntityTimeline({
      companyId,
      entityType: "department",
      entityId: departmentId,
      limit: 20,
    }),
  ])

  if (!department) {
    redirect("/app/company/departments")
  }

  const departmentTeams =
    (teams ?? []).filter((team) =>
      belongsToDepartment(
        team,
        departmentId
      )
    )

  const departmentPositions =
    (positions ?? []).filter((position) =>
      belongsToDepartment(
        position,
        departmentId
      )
    )

  const departmentEmployees =
    (employees ?? []).filter((employee) =>
      belongsToDepartment(
        employee,
        departmentId
      )
    )


  const activityIntelligence =
    presentActivityIntelligence({
      activities:
        departmentTimeline.items,
    })

  const activityAiContext =
    createActivityIntelligenceAIContext({
      intelligence:
        activityIntelligence,
    })

  const executiveAiContext =
    createExecutiveAiContext({
      entityType: "department",
      entityId: department.id,
      companyId,
      title: department.name,
      metrics: [
        {
          id: "teams",
          label: "Times",
          value: String(
            departmentTeams.length
          ),
        },
        {
          id: "positions",
          label: "Cargos",
          value: String(
            departmentPositions.length
          ),
        },
        {
          id: "employees",
          label: "Colaboradores",
          value: String(
            departmentEmployees.length
          ),
        },
        {
          id: "leadership",
          label: "Liderança",
          value:
            department.leaderId
              ? "Líder vinculado"
              : "Sem líder definido",
        },
      ],
      metadata: {
        leaderId:
          department.leaderId ?? "",
      },
      activity: activityAiContext,
    })

  void executiveAiContext

  return (
    <div className="space-y-8">
      <PageHeader
        title={department.name}
        description={
          department.description ??
          "Departamento sem descrição cadastrada."
        }
        actions={
          <DepartmentEditDialog
            companyId={companyId}
            department={department}
          />
        }
      />

      <DashboardSection
        title="Resumo do departamento"
        description="Visão executiva da estrutura e dos vínculos deste departamento."
      >
        <DashboardCard>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              label="Times"
              value={String(
                departmentTeams.length
              )}
            />

            <InfoCard
              label="Cargos"
              value={String(
                departmentPositions.length
              )}
            />

            <InfoCard
              label="Colaboradores"
              value={String(
                departmentEmployees.length
              )}
            />

            <InfoCard
              label="Liderança"
              value={
                department.leaderId
                  ? "Líder vinculado"
                  : "Sem líder definido"
              }
            />
          </div>
        </DashboardCard>
      </DashboardSection>

      <DashboardSection
        title="Gerenciar"
        description="Acesse as áreas relacionadas à operação deste departamento."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <ManagementCard
            title="Times"
            description="Gerencie as equipes que executam o trabalho dentro da estrutura organizacional."
            href="/app/company/teams"
          />

          <ManagementCard
            title="Cargos"
            description="Gerencie as funções, responsabilidades e posições existentes na empresa."
            href="/app/company/positions"
          />

          <ManagementCard
            title="Pessoas"
            description="Gerencie os colaboradores e seus respectivos vínculos organizacionais."
            href="/app/people"
          />
        </div>
      </DashboardSection>

      <DashboardSection
        title="Histórico do departamento"
        description="Acompanhe mudanças estruturais, vínculos e demais acontecimentos relacionados ao departamento."
      >
        <EntityTimelineSection
          title="Atividades recentes"
          description="Registro cronológico das movimentações do departamento."
          emptyTitle="Nenhuma atividade registrada"
          emptyDescription="As alterações e movimentações deste departamento aparecerão aqui."
          items={departmentTimeline.items.map(
            presentDepartmentTimelineItem
          )}
        />
      </DashboardSection>
    </div>
  )
}
