type AssessmentProgressCardProps = {
  title: string
  description?: string | null
  answered: number
  total: number
  currentSection: number
  totalSections: number
  estimatedMinutes?: number
  status: string
}

export function AssessmentProgressCard({
  title,
  description,
  answered,
  total,
  currentSection,
  totalSections,
  estimatedMinutes = 8,
  status,
}: AssessmentProgressCardProps) {
  const progress =
    total === 0
      ? 0
      : Math.round((answered / total) * 100)

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div>
            <h1 className="text-3xl font-bold">
              {title}
            </h1>

            {description ? (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>⏱ {estimatedMinutes} minutos</span>
            <span>📚 Seção {currentSection} de {totalSections}</span>
          </div>
        </div>

        <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {status}
        </span>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span>Progresso</span>
          <strong>{progress}%</strong>
        </div>

        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-6">
        <div>
          <p className="text-2xl font-bold">
            {answered}
          </p>

          <p className="text-xs text-muted-foreground">
            Respondidas
          </p>
        </div>

        <div>
          <p className="text-2xl font-bold">
            {total - answered}
          </p>

          <p className="text-xs text-muted-foreground">
            Pendentes
          </p>
        </div>

        <div>
          <p className="text-2xl font-bold">
            {total}
          </p>

          <p className="text-xs text-muted-foreground">
            Total
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        ✔ Alterações sincronizadas automaticamente.
      </div>
    </div>
  )
}
