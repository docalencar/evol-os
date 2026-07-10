import { Badge } from "@/components/ui/badge"
import { DashboardCard } from "@/components/dashboard"

import type { CompetencyGap } from "../types/competency-gap"

type Props = {
  gaps: CompetencyGap[]
}

const STATUS = {
  strength: {
    label: "Acima do esperado",
    badge: "bg-blue-100 text-blue-700",
    dot: "bg-blue-500",
  },
  matched: {
    label: "Adequado",
    badge: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  attention: {
    label: "Atenção",
    badge: "bg-yellow-100 text-yellow-700",
    dot: "bg-yellow-500",
  },
  critical: {
    label: "Crítico",
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  },
} as const

function formatGap(gap: number) {
  if (gap > 0) {
    return `+${gap}`
  }

  return String(gap)
}

export function CompetencyGapCard({ gaps }: Props) {
  if (gaps.length === 0) {
    return (
      <DashboardCard>
        <div className="py-8 text-center text-sm text-slate-500">
          Nenhuma competência esperada foi cadastrada para este cargo.
        </div>
      </DashboardCard>
    )
  }

  return (
    <DashboardCard>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Competência</th>
              <th className="px-4 py-3 text-center">Atual</th>
              <th className="px-4 py-3 text-center">Esperado</th>
              <th className="px-4 py-3 text-center">Gap</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {gaps.map((gap) => {
              const status = STATUS[gap.status]

              return (
                <tr
                  key={gap.competencyId}
                  className="border-t border-slate-200"
                >
                  <td className="px-4 py-4 font-medium text-slate-900">
                    {gap.competencyName}
                  </td>

                  <td className="px-4 py-4 text-center">
                    {gap.currentLevel}
                  </td>

                  <td className="px-4 py-4 text-center">
                    {gap.expectedLevel}
                  </td>

                  <td className="px-4 py-4 text-center font-semibold">
                    {formatGap(gap.gap)}
                  </td>

                  <td className="px-4 py-4">
                    <Badge
                      className={`gap-2 border-0 ${status.badge}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${status.dot}`}
                      />

                      {status.label}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  )
}
