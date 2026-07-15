type WorkspaceProgressProps = {
  progress: number
  completedSteps: number
  totalSteps: number
}

export function WorkspaceProgress({
  progress,
  completedSteps,
  totalSteps,
}: WorkspaceProgressProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">
            Progresso da configuração
          </p>

          <p className="text-4xl font-bold tracking-tight">
            {progress}%
          </p>

          <p className="text-sm text-slate-300">
            {completedSteps} de {totalSteps} missões concluídas
          </p>
        </div>

        <div className="w-full sm:max-w-md">
          <div
            className="h-3 overflow-hidden rounded-full bg-white/15"
            aria-label={`Progresso da ativação: ${progress}%`}
          >
            <div
              className="h-full rounded-full bg-white transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
