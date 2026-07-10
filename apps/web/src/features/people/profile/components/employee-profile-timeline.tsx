import { DashboardCard } from "@/components/dashboard"

type EmployeeProfileTimelineProps = {
  hireDate?: string | null
}

function formatDate(date?: string | null) {
  if (!date) return "Data não informada"

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(date))
}

export function EmployeeProfileTimeline({
  hireDate,
}: EmployeeProfileTimelineProps) {
  return (
    <DashboardCard
      title="Timeline"
      description="Histórico inicial do colaborador."
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="mt-1 h-2 w-2 rounded-full bg-slate-900" />

          <div>
            <p className="font-medium text-slate-900">Admissão</p>
            <p className="text-sm text-slate-500">
              Colaborador admitido em {formatDate(hireDate)}.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="mt-1 h-2 w-2 rounded-full bg-slate-300" />

          <div>
            <p className="font-medium text-slate-900">Próximos eventos</p>
            <p className="text-sm text-slate-500">
              Avaliações, feedbacks, movimentações e PDIs aparecerão aqui.
            </p>
          </div>
        </div>
      </div>
    </DashboardCard>
  )
}
