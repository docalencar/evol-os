import type {
  ExecutiveBriefViewModel,
  ExecutiveHealthStatus,
} from "../types"

type ExecutiveSummaryProps = {
  brief: ExecutiveBriefViewModel
}

const statusClasses = {
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  attention: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-red-200 bg-red-50 text-red-700",
} satisfies Record<ExecutiveHealthStatus, string>

export function ExecutiveSummary({
  brief,
}: ExecutiveSummaryProps) {
  return (
    <section
      aria-labelledby="executive-summary-title"
      className="rounded-xl border bg-card p-6"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1
              id="executive-summary-title"
              className="text-3xl font-bold tracking-tight"
            >
              {brief.title}
            </h1>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClasses[brief.status]}`}
            >
              {brief.statusLabel}
            </span>
          </div>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {brief.description}
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Atualizado em {brief.generatedAtLabel}
        </p>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryMetric
          label="Colaboradores"
          value={brief.totalEmployeesLabel}
        />

        <SummaryMetric
          label="Colaboradores críticos"
          value={brief.criticalEmployeesLabel}
        />

        <SummaryMetric
          label="Riscos organizacionais"
          value={brief.organizationalRisksLabel}
        />

        <SummaryMetric
          label="Sugestões disponíveis"
          value={brief.aiSuggestionsLabel}
        />

        <SummaryMetric
          label="Alertas executivos"
          value={brief.alertCountLabel}
        />
      </dl>
    </section>
  )
}

function SummaryMetric({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>

      <dd className="mt-2 text-2xl font-bold">
        {value}
      </dd>
    </div>
  )
}
