import { Badge } from "@/components/ui/badge"
import { DashboardCard } from "@/components/dashboard"

import type {
  PersonCompetencyCoverageViewModel,
  PersonCompetencyGapState,
} from "../presenters/present-person-competency-coverage"

type Props = {
  coverage: PersonCompetencyCoverageViewModel
}

const STATE = {
  deficiency: { label: "Gap de desenvolvimento", badge: "bg-red-100 text-red-700" },
  meets_expectation: { label: "Atende ao esperado", badge: "bg-green-100 text-green-700" },
  exceeds_expectation: { label: "Acima do esperado", badge: "bg-blue-100 text-blue-700" },
  unassessed: { label: "Não avaliada", badge: "bg-slate-100 text-slate-700" },
} satisfies Record<PersonCompetencyGapState, { label: string; badge: string }>

const EMPTY_MESSAGE = {
  no_position: "Este colaborador ainda não possui um cargo definido.",
  missing_profile: "O cargo desta pessoa ainda não possui um perfil de senioridade atribuído.",
  stale_assignment: "A atribuição de cargo e senioridade desta pessoa está desatualizada.",
  active_assignment_with_no_expectations: "Ainda não há competências configuradas para este cargo e senioridade.",
} as const

function formatGap(gap: number | null): string {
  if (gap === null) return "—"
  if (gap > 0) return `+${gap}`
  return String(gap)
}

export function PersonCompetencyGapCard({ coverage }: Props) {
  if (coverage.assignmentState !== "active_assignment_with_expectations") {
    return (
      <DashboardCard>
        <div className="py-8 text-center text-sm text-slate-500">
          {EMPTY_MESSAGE[coverage.assignmentState]}
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
              <th className="px-4 py-3">Situação</th>
            </tr>
          </thead>
          <tbody>
            {coverage.competencies.map((competency) => {
              const state = STATE[competency.state]
              return (
                <tr key={competency.competencyId} className="border-t border-slate-200">
                  <td className="px-4 py-4 font-medium text-slate-900">{competency.competencyName}</td>
                  <td className="px-4 py-4 text-center">{competency.currentLevel ?? "—"}</td>
                  <td className="px-4 py-4 text-center">{competency.expectedLevel}</td>
                  <td className="px-4 py-4 text-center font-semibold">{formatGap(competency.gap)}</td>
                  <td className="px-4 py-4">
                    <Badge className={`border-0 ${state.badge}`}>{state.label}</Badge>
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
