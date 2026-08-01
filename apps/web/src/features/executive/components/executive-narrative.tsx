import type {
  ExecutiveHealthStatus,
  ExecutiveNarrativeViewModel,
} from "../types"

type ExecutiveNarrativeProps = {
  narrative: ExecutiveNarrativeViewModel
}

const statusClasses = {
  healthy: "border-emerald-200 bg-emerald-50",
  attention: "border-amber-200 bg-amber-50",
  critical: "border-red-200 bg-red-50",
} satisfies Record<ExecutiveHealthStatus, string>

export function ExecutiveNarrative({
  narrative,
}: ExecutiveNarrativeProps) {
  return (
    <section
      aria-labelledby="executive-narrative-title"
      className={`rounded-xl border p-6 ${statusClasses[narrative.status]}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="executive-narrative-title"
          className="text-lg font-semibold"
        >
          {narrative.title}
        </h2>

        <span className="rounded-full border bg-background px-3 py-1 text-xs font-semibold">
          {narrative.statusLabel}
        </span>
      </div>

      <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">
        {narrative.body}
      </p>
    </section>
  )
}