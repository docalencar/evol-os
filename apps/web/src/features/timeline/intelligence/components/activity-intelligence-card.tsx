import Link from "next/link"

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Info,
  Lightbulb,
  Sparkles,
} from "lucide-react"

import {
  DashboardCard,
  KeyValueList,
} from "@/components/dashboard"

import {
  Badge,
} from "@/components/ui/badge"

import {
  Button,
} from "@/components/ui/button"

import type {
  ActivityInsightKind,
  ActivityIntelligenceInsight,
  ActivityIntelligencePriority,
  ActivityIntelligenceViewModel,
} from "../types"

type ActivityIntelligenceCardProps = {
  intelligence: ActivityIntelligenceViewModel
  maxInsights?: number
}

const PRIORITY_LABELS: Record<
  ActivityIntelligencePriority,
  string
> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  informational: "Informativa",
}

function getInsightIcon(
  kind: ActivityInsightKind
) {
  switch (kind) {
    case "alert":
    case "risk":
      return (
        <AlertTriangle
          className="h-5 w-5"
          aria-hidden="true"
        />
      )

    case "opportunity":
      return (
        <Lightbulb
          className="h-5 w-5"
          aria-hidden="true"
        />
      )

    case "trend":
      return (
        <CircleAlert
          className="h-5 w-5"
          aria-hidden="true"
        />
      )

    case "recommendation":
      return (
        <Sparkles
          className="h-5 w-5"
          aria-hidden="true"
        />
      )

    case "summary":
      return (
        <Info
          className="h-5 w-5"
          aria-hidden="true"
        />
      )
  }
}

function getPriorityClassName(
  priority: ActivityIntelligencePriority
) {
  switch (priority) {
    case "critical":
      return [
        "border-red-200",
        "bg-red-50",
        "text-red-700",
      ].join(" ")

    case "high":
      return [
        "border-orange-200",
        "bg-orange-50",
        "text-orange-700",
      ].join(" ")

    case "medium":
      return [
        "border-amber-200",
        "bg-amber-50",
        "text-amber-700",
      ].join(" ")

    case "low":
      return [
        "border-slate-200",
        "bg-slate-100",
        "text-slate-700",
      ].join(" ")

    case "informational":
      return [
        "border-blue-200",
        "bg-blue-50",
        "text-blue-700",
      ].join(" ")
  }
}

function ActivityInsightItem({
  insight,
}: {
  insight: ActivityIntelligenceInsight
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-slate-600">
          {getInsightIcon(
            insight.kind
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900">
              {insight.title}
            </h4>

            <Badge
              className={getPriorityClassName(
                insight.priority
              )}
            >
              {
                PRIORITY_LABELS[
                  insight.priority
                ]
              }
            </Badge>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {insight.description}
          </p>

          {insight.reason ? (
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Motivo: {insight.reason}
            </p>
          ) : null}

          {insight.recommendedActions.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {insight.recommendedActions.map(
                (action) =>
                  action.href ? (
                    <Link
                      key={action.id}
                      href={action.href}
                      className={[
                        "inline-flex",
                        "h-8",
                        "items-center",
                        "justify-center",
                        "rounded-md",
                        "bg-slate-100",
                        "px-3",
                        "text-sm",
                        "font-medium",
                        "text-slate-900",
                        "transition-colors",
                        "hover:bg-slate-200",
                        "focus-visible:outline-none",
                        "focus-visible:ring-2",
                        "focus-visible:ring-slate-400",
                        "focus-visible:ring-offset-2",
                      ].join(" ")}
                    >
                      {action.label}

                      <ArrowRight
                        className="ml-2 h-4 w-4"
                        aria-hidden="true"
                      />
                    </Link>
                  ) : (
                    <Button
                      key={action.id}
                      size="sm"
                      variant="secondary"
                      disabled
                    >
                      {action.label}
                    </Button>
                  )
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function ActivityIntelligenceCard({
  intelligence,
  maxInsights = 5,
}: ActivityIntelligenceCardProps) {
  const visibleInsights =
    intelligence.insights.slice(
      0,
      maxInsights
    )

  const hasInsights =
    visibleInsights.length > 0

  const hasHighPriorityInsights =
    intelligence.summary
      .highPriorityInsights > 0 ||
    intelligence.summary
      .criticalInsights > 0

  return (
    <DashboardCard
      title="Inteligência de atividades"
      description="Leitura executiva das movimentações recentes"
    >
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-white p-2 text-slate-700 shadow-sm">
              {hasHighPriorityInsights ? (
                <CircleAlert
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2
                  className="h-5 w-5"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">
                {
                  intelligence.summary
                    .headline
                }
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                {
                  intelligence.summary
                    .description
                }
              </p>
            </div>
          </div>
        </div>

        <KeyValueList
          items={[
            {
              label: "Atividades analisadas",
              value:
                intelligence.summary
                  .totalActivities,
            },
            {
              label: "Insights gerados",
              value:
                intelligence.summary
                  .totalInsights,
            },
            {
              label: "Críticos",
              value:
                intelligence.summary
                  .criticalInsights,
            },
            {
              label: "Alta prioridade",
              value:
                intelligence.summary
                  .highPriorityInsights,
            },
            {
              label: "Média prioridade",
              value:
                intelligence.summary
                  .mediumPriorityInsights,
            },
          ]}
        />

        {hasInsights ? (
          <div className="space-y-3">
            {visibleInsights.map(
              (insight) => (
                <ActivityInsightItem
                  key={insight.id}
                  insight={insight}
                />
              )
            )}

            {intelligence.insights.length >
            visibleInsights.length ? (
              <p className="text-xs text-slate-500">
                Mais{" "}
                {intelligence.insights
                  .length -
                  visibleInsights.length}{" "}
                insight(s) não exibido(s).
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
            <CheckCircle2
              className="mx-auto h-8 w-8 text-slate-400"
              aria-hidden="true"
            />

            <p className="mt-3 text-sm font-medium text-slate-700">
              Nenhum ponto de atenção
            </p>

            <p className="mt-1 text-sm text-slate-500">
              As atividades disponíveis não
              geraram insights relevantes.
            </p>
          </div>
        )}
      </div>
    </DashboardCard>
  )
}
