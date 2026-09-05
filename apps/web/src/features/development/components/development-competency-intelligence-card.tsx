import { AlertTriangle, CheckCircle2, CircleHelp, TrendingUp } from "lucide-react"

import {
  DashboardCard,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard"
import type { DashboardCompetencyDevelopment } from "@/features/dashboard-read/types/dashboard-competency-development"

type DevelopmentCompetencyIntelligenceCardProps = Readonly<{
  intelligence: DashboardCompetencyDevelopment
}>

const UNAVAILABLE_LABELS = {
  no_position: "sem cargo",
  missing_profile: "sem perfil de senioridade",
  stale_assignment: "com atribuição indisponível",
  active_assignment_with_no_expectations: "sem expectativas configuradas",
} as const

export function DevelopmentCompetencyIntelligenceCard({
  intelligence,
}: DevelopmentCompetencyIntelligenceCardProps) {
  const unavailable = intelligence.people.filter(
    (person) => person.assignmentState !== "active_assignment_with_expectations",
  )

  return (
    <DashboardSection
      title="Inteligência de competências"
      description="Visão factual das expectativas de cargo e senioridade para orientar o desenvolvimento."
    >
      <DashboardCard>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Summary label="Deficiência" value={intelligence.deficiencies} icon={<AlertTriangle size={16} />} />
          <Summary label="Atende" value={intelligence.meets} icon={<CheckCircle2 size={16} />} />
          <Summary label="Supera" value={intelligence.exceeds} icon={<TrendingUp size={16} />} />
          <Summary label="Não avaliada" value={intelligence.unassessed} icon={<CircleHelp size={16} />} />
        </div>

        {intelligence.priorities.length === 0 ? (
          <div className="mt-6">
            <DashboardEmptyState
              title="Nenhuma deficiência avaliada"
              description="Competências não avaliadas permanecem separadas e não são classificadas como deficiência."
              icon={<CheckCircle2 size={20} />}
            />
          </div>
        ) : (
          <div className="mt-6 divide-y divide-slate-100">
            {intelligence.priorities.slice(0, 5).map((item) => (
              <div key={`${item.personId}:${item.competencyId}`} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{item.personName}</p>
                  <p className="truncate text-sm text-slate-500">{item.competencyName}</p>
                </div>
                <span className="shrink-0 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                  Deficiência · {item.gap}
                </span>
              </div>
            ))}
          </div>
        )}

        {unavailable.length > 0 ? (
          <ul className="mt-5 space-y-1 text-sm text-slate-500">
            {unavailable.slice(0, 5).map((person) => (
              <li key={person.personId}>
                {person.personName}: {person.assignmentState === "active_assignment_with_expectations"
                  ? ""
                  : UNAVAILABLE_LABELS[person.assignmentState]}.
              </li>
            ))}
          </ul>
        ) : null}
      </DashboardCard>
    </DashboardSection>
  )
}

function Summary({
  label,
  value,
  icon,
}: Readonly<{ label: string; value: number; icon: React.ReactNode }>) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-sm text-slate-600">{icon}{label}</div>
      <p className="mt-1 text-xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}
