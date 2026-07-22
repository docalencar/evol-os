import {
  DashboardCard,
  DashboardSection,
  KeyValueList,
  StatCard,
} from "@/components/dashboard"
import { EmptyState } from "@/components/empty-state/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import {
  getAllowedJobOpeningStatusTransitions,
  getJobOpeningById,
  getJobOpeningFormOptions,
  JobOpeningStatusActions,
  JOB_OPENING_EMPLOYMENT_TYPE_LABELS,
  JOB_OPENING_PRIORITY_LABELS,
  JOB_OPENING_REASON_LABELS,
  JOB_OPENING_STATUS_LABELS,
  JOB_OPENING_WORK_MODEL_LABELS,
  jobOpeningIdSchema,
} from "@/features/recruitment"
import {
  EntityTimelineSection,
  getEntityTimeline,
  type ActivityTimelineItemViewModel,
} from "@/features/timeline"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type JobOpeningDetailsPageProps = {
  params: Promise<{
    jobOpeningId: string
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

function formatDate(value: string | null) {
  if (!value) {
    return "Não informado"
  }

  const normalizedDate = value.includes("T")
    ? value
    : `${value}T00:00:00`

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(normalizedDate)
  )
}

function formatCurrency(value: number | null) {
  if (value === null) {
    return "Não informado"
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatTimelineLabel(value: string) {
  return value
    .replace(/[_.-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function presentJobOpeningTimelineItem(
  item: ActivityTimelineItemViewModel
) {
  return {
    title: item.title,
    description: item.description,
    actorLabel: ACTOR_LABELS[item.actorType],
    occurredAtLabel: formatTimelineDate(item.occurredAt),
    moduleLabel: formatTimelineLabel(item.module),
    activityTypeLabel: formatTimelineLabel(item.activityType),
  }
}

export default async function JobOpeningDetailsPage({
  params,
}: JobOpeningDetailsPageProps) {
  const { jobOpeningId } = await params
  const idResult = jobOpeningIdSchema.safeParse({
    jobOpeningId,
  })

  if (!idResult.success) {
    return (
      <EmptyState
        title="Vaga não encontrada."
        description="Não foi possível localizar a vaga solicitada."
      />
    )
  }

  const { companyId } = await getCurrentCompanyContext()
  const [jobOpening, options, jobOpeningTimeline] = await Promise.all([
    getJobOpeningById(
      companyId,
      idResult.data.jobOpeningId
    ),
    getJobOpeningFormOptions(companyId),
    getEntityTimeline({
      companyId,
      entityType: "job_opening",
      entityId: idResult.data.jobOpeningId,
      limit: 20,
    }),
  ])

  if (!jobOpening) {
    return (
      <EmptyState
        title="Vaga não encontrada."
        description="Não foi possível localizar a vaga solicitada."
      />
    )
  }

  const department = options.departments.find(
    (item) => item.id === jobOpening.departmentId
  )
  const position = options.positions.find(
    (item) => item.id === jobOpening.positionId
  )
  const requestingManager = options.employees.find(
    (item) => item.id === jobOpening.requestingManagerId
  )
  const recruiter = options.employees.find(
    (item) => item.id === jobOpening.recruiterId
  )
  const salaryRange =
    jobOpening.salaryMin === null &&
    jobOpening.salaryMax === null
      ? "Não informado"
      : `${formatCurrency(jobOpening.salaryMin)} — ${formatCurrency(
          jobOpening.salaryMax
        )}`

  return (
    <div className="space-y-8">
      <PageHeader
        title={jobOpening.title}
        description="Detalhes e contexto da vaga."
        actions={
          <>
            <Badge>
              {JOB_OPENING_STATUS_LABELS[jobOpening.status]}
            </Badge>
            <JobOpeningStatusActions
              jobOpeningId={jobOpening.id}
              currentStatus={jobOpening.status}
              allowedTransitions={
                getAllowedJobOpeningStatusTransitions(
                  jobOpening.status
                )
              }
              approverId={jobOpening.approverId}
              employees={options.employees}
            />
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Prioridade"
          value={JOB_OPENING_PRIORITY_LABELS[jobOpening.priority]}
        />
        <StatCard
          label="Departamento"
          value={department?.name ?? "Não encontrado"}
        />
        <StatCard
          label="Cargo"
          value={position?.name ?? "Não encontrado"}
        />
        <StatCard
          label="Data prevista"
          value={formatDate(jobOpening.targetHireDate)}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardCard title="Informações da vaga">
          <KeyValueList
            items={[
              {
                label: "Motivo",
                value:
                  JOB_OPENING_REASON_LABELS[
                    jobOpening.openingReason
                  ],
              },
              {
                label: "Justificativa",
                value:
                  jobOpening.openingJustification ||
                  "Não informado",
              },
              {
                label: "Descrição",
                value:
                  jobOpening.description || "Não informado",
              },
            ]}
          />
        </DashboardCard>

        <DashboardCard title="Estrutura organizacional">
          <KeyValueList
            items={[
              {
                label: "Departamento",
                value: department?.name ?? "Não encontrado",
              },
              {
                label: "Cargo",
                value: position?.name ?? "Não encontrado",
              },
              {
                label: "Gestor solicitante",
                value:
                  requestingManager?.fullName ?? "Não encontrado",
              },
              {
                label: "Recruiter",
                value: recruiter?.fullName ?? "Não informado",
              },
            ]}
          />
        </DashboardCard>

        <DashboardCard title="Dimensionamento">
          <KeyValueList
            items={[
              {
                label: "Quantidade de posições",
                value: jobOpening.positionsCount,
              },
              {
                label: "Headcount atual",
                value: jobOpening.currentHeadcount,
              },
              {
                label: "Headcount alvo",
                value: jobOpening.targetHeadcount,
              },
            ]}
          />
        </DashboardCard>

        <DashboardCard title="Condições">
          <KeyValueList
            items={[
              {
                label: "Modelo de trabalho",
                value:
                  JOB_OPENING_WORK_MODEL_LABELS[
                    jobOpening.workModel
                  ],
              },
              {
                label: "Tipo de contratação",
                value:
                  JOB_OPENING_EMPLOYMENT_TYPE_LABELS[
                    jobOpening.employmentType
                  ],
              },
              {
                label: "Orçamento",
                value: jobOpening.isBudgeted
                  ? "Previsto"
                  : "Não previsto",
              },
              {
                label: "Faixa salarial",
                value: salaryRange,
              },
            ]}
          />
        </DashboardCard>
      </div>

      <DashboardCard title="Observações">
        <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {jobOpening.notes || "Não informado"}
        </p>
      </DashboardCard>

      <DashboardSection
        title="Atividades"
        description="Acompanhe as movimentações relacionadas a esta vaga."
      >
        <EntityTimelineSection
          title="Atividades recentes"
          description="Registro cronológico das movimentações da vaga."
          emptyTitle="Nenhuma atividade registrada"
          emptyDescription="As movimentações desta vaga aparecerão aqui."
          items={jobOpeningTimeline.items.map(
            presentJobOpeningTimelineItem
          )}
        />
      </DashboardSection>
    </div>
  )
}
