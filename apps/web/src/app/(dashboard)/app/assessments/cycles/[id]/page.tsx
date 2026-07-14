import Link from "next/link"
import { notFound } from "next/navigation"

import { DashboardSection } from "@/components/dashboard"
import { PageHeader } from "@/components/shared/page-header"

import {
  AddParticipantsDialog,
  GenerateCycleAssessmentsButton,
  getAssessmentCycleById,
  getAssessmentCycleParticipants,
  type AssessmentCycle,
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

type Props = {
  params: Promise<{
    id: string
  }>
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR")
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

  const participants =
    await getAssessmentCycleParticipants(
      companyId,
      cycle.id
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
              Encerramento
            </p>

            <p className="mt-2 font-semibold">
              {formatDate(cycle.end_date)}
            </p>
          </div>

        </div>
      </DashboardSection>


      <DashboardSection
        title="Indicadores"
        description="Resumo do ciclo."
      >
        <div className="grid gap-4 md:grid-cols-4">

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Participantes
            </p>

            <p className="mt-2 text-3xl font-bold">
              {participants.length}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Avaliações
            </p>

            <p className="mt-2 text-3xl font-bold">
              0
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Concluídas
            </p>

            <p className="mt-2 text-3xl font-bold text-emerald-600">
              0
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              Pendentes
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-600">
              0
            </p>
          </div>

        </div>
      </DashboardSection>

      <DashboardSection
        title="Participantes"
        description="Os participantes serão adicionados nas próximas PRs."
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
        description="As avaliações geradas aparecerão aqui."
      >
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Nenhuma avaliação gerada.
        </div>
      </DashboardSection>

    </div>
  )
}
