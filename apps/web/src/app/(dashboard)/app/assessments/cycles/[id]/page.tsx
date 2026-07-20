import Link from "next/link"
import { notFound } from "next/navigation"

import { DashboardSection } from "@/components/dashboard"
import { PageHeader } from "@/components/shared/page-header"

import {
  AddParticipantsDialog,
  AssessmentCycleProgressOverview,
  AssessmentCycleResultsCard,
  GenerateCycleAssessmentsButton,
  getAssessmentCycleById,
  getAssessmentCycleParticipants,
  getAssessmentResponsesByCycle,
  presentAssessmentCycleDashboard,
  type AssessmentCycle,
  type AssessmentResponseStatus,
} from "@/features/assessments"

import {
  getEmployees,
  type Employee,
} from "@/features/people"

import {
  ASSESSMENT_CYCLE_STATUS_LABELS,
  ASSESSMENT_CYCLE_TYPE_LABELS,
} from "@/features/assessments/constants/assessment-cycle-options"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type CycleAssessmentResponse = {
  id: string
  status: AssessmentResponseStatus
  employee: {
    id: string
    full_name: string
    email: string | null
  } | null
  evaluator: {
    id: string
    full_name: string
  } | null
}

type Props = {
  params: Promise<{
    id: string
  }>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR")
}

function getResponseStatusLabel(
  status: AssessmentResponseStatus
) {
  switch (status) {
    case "draft":
      return "Não iniciada"

    case "in_progress":
      return "Em andamento"

    case "submitted":
      return "Enviada"

    case "completed":
      return "Concluída"

    case "cancelled":
      return "Cancelada"

    default:
      return status
  }
}

function getResponseStatusClassName(
  status: AssessmentResponseStatus
) {
  switch (status) {
    case "completed":
    case "submitted":
      return "bg-emerald-50 text-emerald-700"

    case "in_progress":
      return "bg-blue-50 text-blue-700"

    case "cancelled":
      return "bg-red-50 text-red-700"

    case "draft":
    default:
      return "bg-amber-50 text-amber-700"
  }
}


export default async function AssessmentCyclePage({
  params,
}: Props) {
  const { id } = await params

  const { companyId } =
    await getCurrentCompanyContext()

  const cycleData =
    await getAssessmentCycleById(
      companyId,
      id
    )

  if (!cycleData) {
    notFound()
  }

  const cycle = cycleData as AssessmentCycle

  const employees =
    (await getEmployees(companyId)) as Employee[]

  const [participants, responsesData] =
    await Promise.all([
      getAssessmentCycleParticipants(
        companyId,
        cycle.id
      ),
      getAssessmentResponsesByCycle(
        companyId,
        cycle.id
      ),
    ])

  const responses =
    responsesData as CycleAssessmentResponse[]

  const dashboard =
    presentAssessmentCycleDashboard(
      participants,
      responses
    )

  return (
    <div className="space-y-8">
      <PageHeader
        title={cycle.name}
        description={
          cycle.description ??
          "Gerencie este ciclo de avaliação."
        }
        actions={
          <div className="flex items-center gap-2">

            <Link
              href="/app/assessments"
              className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Voltar
            </Link>

            <AddParticipantsDialog
              companyId={companyId}
              assessmentCycleId={cycle.id}
              employees={employees}
            />

            <GenerateCycleAssessmentsButton
              companyId={companyId}
              assessmentCycleId={cycle.id}
              assessmentTemplateId={
                cycle.assessment_template_id
              }
              disabled={participants.length === 0}
            />

          </div>
        }
      />

      <DashboardSection
        title="Resumo"
        description="Informações gerais do ciclo."
      >
        <div className="grid gap-4 md:grid-cols-4">

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Status
            </p>

            <p className="mt-2 font-semibold">
              {ASSESSMENT_CYCLE_STATUS_LABELS[
                cycle.status
              ]}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Tipo
            </p>

            <p className="mt-2 font-semibold">
              {ASSESSMENT_CYCLE_TYPE_LABELS[
                cycle.assessment_type
              ]}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Início
            </p>

            <p className="mt-2 font-semibold">
              {formatDate(cycle.start_date)}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Data final
            </p>

            <p className="mt-2 font-semibold">
              {formatDate(cycle.end_date)}
            </p>
          </div>

        </div>
      </DashboardSection>


      <DashboardSection
        title="Resultados"
        description="Resumo executivo do ciclo."
      >
        <AssessmentCycleResultsCard
          results={dashboard.results}
        />
      </DashboardSection>

      <DashboardSection
        title="Indicadores"
        description="Acompanhe o progresso real deste ciclo."
      >
        <AssessmentCycleProgressOverview
          participants={dashboard.participantsCount}
          progress={dashboard.progress}
        />
      </DashboardSection>

      <DashboardSection
        title="Participantes"
        description="Colaboradores incluídos neste ciclo de avaliação."
      >
        {participants.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            Nenhum participante cadastrado.
          </div>
        ) : (
          <div className="rounded-lg border">
            <table className="w-full">
              <tbody>
                {participants.map((participant) => (
                  <tr
                    key={participant.id}
                    className="border-b last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium">
                      {participant.people.full_name}
                    </td>

                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {participant.people.email ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardSection>

      <DashboardSection
        title="Avaliações"
        description="Acompanhe as avaliações geradas para este ciclo."
      >
        {responses.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            Nenhuma avaliação gerada.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Colaborador
                    </th>

                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Avaliador
                    </th>

                    <th className="px-4 py-3 text-left text-sm font-medium">
                      Status
                    </th>

                    <th className="px-4 py-3 text-right text-sm font-medium">
                      Ação
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {responses.map((response) => (
                    <tr
                      key={response.id}
                      className="border-b last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {response.employee?.full_name ??
                            "Colaborador não encontrado"}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          {response.employee?.email ??
                            "Sem e-mail cadastrado"}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-sm">
                        {response.evaluator?.full_name ?? "-"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                            getResponseStatusClassName(
                              response.status
                            ),
                          ].join(" ")}
                        >
                          {getResponseStatusLabel(
                            response.status
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/app/assessments/responses/${response.id}`}
                          className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          {response.status === "draft"
                            ? "Responder"
                            : "Abrir"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DashboardSection>

    </div>
  )
}
