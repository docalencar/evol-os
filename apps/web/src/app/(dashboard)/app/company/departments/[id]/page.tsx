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
  DepartmentEditDialog,
  getDepartmentById,
} from "@/features/organization/departments"

import {
  EntityTimelineSection,
  getEntityTimeline,
  type ActivityTimelineItemViewModel,
} from "@/features/timeline"

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
    departmentTimeline,
  ] = await Promise.all([
    getDepartmentById(
      companyId,
      departmentId
    ),

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
        title="Visão geral"
        description="Informações principais e situação atual do departamento."
      >
        <DashboardCard>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoCard
              label="Nome"
              value={department.name}
            />

            <InfoCard
              label="Liderança"
              value={
                department.leaderId
                  ? "Líder vinculado"
                  : "Sem líder definido"
              }
            />

            <InfoCard
              label="Situação"
              value={
                department.archivedAt
                  ? "Arquivado"
                  : "Ativo"
              }
            />

            <InfoCard
              label="Criado em"
              value={formatDate(
                department.createdAt
              )}
            />

            <InfoCard
              label="Última atualização"
              value={formatDate(
                department.updatedAt
              )}
            />
          </div>
        </DashboardCard>
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
