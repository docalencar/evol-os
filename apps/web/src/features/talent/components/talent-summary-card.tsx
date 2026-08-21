import Link from "next/link"

import { DashboardCard } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { EmployeeInsights } from "../types/employee-insights"
import type { CompetencyCoverage } from "../types/competency-coverage"

type TalentSummaryCardProps = {
  insights: EmployeeInsights
  coverage: CompetencyCoverage
  positionId?: string | null
}

const DEVELOPMENT_PRIORITY_LABELS = {
  low: "Baixa",
  medium: "Moderada",
  high: "Alta",
} as const

const DEVELOPMENT_PRIORITY_CLASSES = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
} as const

export function TalentSummaryCard({
  insights,
  coverage,
  positionId,
}: TalentSummaryCardProps) {
  const { talentCard, biggestGap, risk, promotionReady } = insights

  if (coverage.state !== "assessed" && coverage.state !== "partially_assessed") {
    const message = {
      no_position: "Este colaborador ainda não possui um cargo definido.",
      not_configured: "Competências ainda não configuradas para este cargo.",
      not_assessed: "Competências ainda não avaliadas.",
    }[coverage.state]

    return (
      <DashboardCard
        title="Talent Card"
        description="Resumo da aderência do colaborador ao cargo atual."
      >
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
          <p className="text-lg font-semibold text-slate-900">
            {message}
          </p>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            A aderência ficará disponível conforme os níveis das competências
            forem registrados. Isso não impede o uso normal do perfil.
          </p>

          {coverage.state === "not_configured" && positionId ? (
            <div className="mt-6">
              <Link href="/app/company/positions">
                <Button variant="secondary">
                  Configurar competências do cargo
                 </Button>
              </Link>
            </div>
          ) : null}
        </div>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard
      title="Talent Card"
      description="Resumo da aderência do colaborador ao cargo atual."
    >
      <div className="space-y-6">
        {coverage.state === "partially_assessed" ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="font-medium text-blue-900">Avaliação parcial</p>
            <p className="mt-1 text-sm text-blue-700">
              {coverage.assessedCount} de {coverage.expectedCount} competências avaliadas.
              A aderência abaixo considera somente os níveis registrados.
            </p>
          </div>
        ) : null}

        <div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm text-slate-500">
                {coverage.state === "partially_assessed"
                  ? "Aderência parcial"
                  : "Aderência ao cargo"}
              </p>

              <p className="mt-1 text-4xl font-bold text-slate-900">
                {talentCard.adherence}%
              </p>

              <p className="mt-2 text-sm text-slate-600">
                {getAdherenceMessage(talentCard.adherence)}
              </p>
            </div>

            {coverage.state === "assessed" ? <Badge>
              {promotionReady
                ? "Pronto para evolução"
                : "Em desenvolvimento"}
            </Badge> : null}
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${Math.min(
                  Math.max(talentCard.adherence, 0),
                  100
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="Pontos fortes"
            value={talentCard.strengths}
          />

          <Metric
            label="Adequadas"
            value={talentCard.matched}
          />

          <Metric
            label="Atenção"
            value={talentCard.attention}
          />

          <Metric
            label="Críticas"
            value={talentCard.critical}
          />
        </div>

        <div className="grid gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Maior gap
            </p>

            <p className="mt-2 font-semibold text-slate-900">
              {biggestGap ?? "Nenhum gap identificado"}
            </p>
          </div>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm text-slate-500">
              Prioridade de desenvolvimento
            </p>

            <div className="mt-2">
              <Badge
                className={`border-0 ${DEVELOPMENT_PRIORITY_CLASSES[risk]}`}
              >
                {DEVELOPMENT_PRIORITY_LABELS[risk]}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-sm text-slate-600">{label}</p>

      <p className="text-xl font-semibold text-slate-900">
        {value}
      </p>
    </div>
  )
}

function getAdherenceMessage(adherence: number) {
  if (adherence >= 90) {
    return "Excelente aderência às competências esperadas."
  }

  if (adherence >= 75) {
    return "Boa aderência, com oportunidades pontuais de desenvolvimento."
  }

  if (adherence >= 50) {
    return "Aderência moderada, com competências que precisam de atenção."
  }

  return "Existem gaps importantes que exigem um plano de desenvolvimento."
}
