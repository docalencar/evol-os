import { Card } from "@/components/ui/card"

import type {
  AssessmentStatisticsViewModel,
} from "../../presenters/present-assessment-statistics"

type Props = {
  statistics: AssessmentStatisticsViewModel
}

function formatScore(score: number) {
  return Number.isInteger(score)
    ? score.toFixed(0)
    : score.toFixed(2)
}

function formatPercentage(percentage: number) {
  return `${percentage.toFixed(1)}%`
}

export function AssessmentScoreDistributionCard({
  statistics,
}: Props) {
  const hasScores =
    statistics.distribution.length > 0

  return (
    <Card className="p-6">
      <div className="space-y-1">
        <h3 className="font-semibold leading-none tracking-tight">
          Distribuição das notas
        </h3>

        <p className="text-sm text-muted-foreground">
          Quantidade e participação das respostas por pontuação.
        </p>
      </div>

      <div className="mt-6">
        {hasScores ? (
          <div className="space-y-5">
            {statistics.distribution.map(
              (item) => (
                <div
                  key={item.score}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-medium">
                      Nota {formatScore(item.score)}
                    </span>

                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground">
                        {item.count}{" "}
                        {item.count === 1
                          ? "resposta"
                          : "respostas"}
                      </span>

                      <span className="min-w-12 text-right font-medium">
                        {formatPercentage(
                          item.percentage
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-[width]"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(
                            0,
                            item.percentage
                          )
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium">
              Nenhuma nota disponível
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              A distribuição será exibida quando houver respostas pontuadas.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
