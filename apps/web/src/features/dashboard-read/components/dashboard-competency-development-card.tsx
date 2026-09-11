import { AlertTriangle, CheckCircle2, CircleHelp, TrendingUp } from "lucide-react"

import {
  DashboardCard,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard"

import type { DashboardCompetencyIntelligence } from "../types/dashboard-competency-development"

type DashboardCompetencyDevelopmentCardProps = Readonly<{
  development: DashboardCompetencyIntelligence
}>

const ASSIGNMENT_STATE_LABELS = {
  no_position: "Sem cargo",
  missing_profile: "Sem perfil de senioridade",
  stale_assignment: "Atribuição indisponível",
  active_assignment_with_no_expectations: "Sem expectativas configuradas",
} as const

function getUnavailableAssignmentLabel(
  state: keyof typeof ASSIGNMENT_STATE_LABELS | "active_assignment_with_expectations",
): string | null {
  return state === "active_assignment_with_expectations"
    ? null
    : ASSIGNMENT_STATE_LABELS[state]
}

export function DashboardCompetencyDevelopmentCard({
  development,
}: DashboardCompetencyDevelopmentCardProps) {
  // Says what is true — this is not your data to see — instead of four zeros,
  // which would read as "your company has no competency gaps".
  if (development.status === "forbidden") {
    return (
      <DashboardSection
        title="Desenvolvimento por competências"
        description="Lacunas factuais da matriz de cargo e senioridade, sem considerar competências ainda não avaliadas como deficiência."
      >
        <DashboardCard>
          <p className="text-sm text-slate-500">
            Esta visão consolidada da empresa está disponível apenas para
            administradores. Nenhum número é exibido aqui porque nenhum foi
            consultado — o que não significa ausência de dados.
          </p>
        </DashboardCard>
      </DashboardSection>
    )
  }

  const { development: intelligence } = development
  const unavailablePeople = intelligence.people.filter(
    (person) => person.assignmentState !== "active_assignment_with_expectations",
  )

  return (
    <DashboardSection
      title="Desenvolvimento por competências"
      description="Lacunas factuais da matriz de cargo e senioridade, sem considerar competências ainda não avaliadas como deficiência."
    >
      <DashboardCard>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Deficiência" value={intelligence.deficiencies} icon={<AlertTriangle size={16} />} />
          <Summary label="Atende" value={intelligence.meets} icon={<CheckCircle2 size={16} />} />
          <Summary label="Supera" value={intelligence.exceeds} icon={<TrendingUp size={16} />} />
          <Summary label="Não avaliada" value={intelligence.unassessed} icon={<CircleHelp size={16} />} />
        </div>

        {intelligence.priorities.length === 0 ? (
          <div className="mt-6">
            <DashboardEmptyState
              title="Nenhuma deficiência avaliada"
              description="Competências não avaliadas permanecem separadas e não entram na priorização."
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

        {unavailablePeople.length > 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            {unavailablePeople.length} {unavailablePeople.length === 1 ? "colaborador possui" : "colaboradores possuem"} contexto indisponível: {unavailablePeople
              .map((person) => getUnavailableAssignmentLabel(person.assignmentState))
              .filter((label): label is string => label !== null)
              .filter((label, index, labels) => labels.indexOf(label) === index)
              .join(", ")}.
          </p>
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
