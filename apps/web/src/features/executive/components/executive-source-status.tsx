import type { ExecutiveHomeViewModel } from "../types"

type ExecutiveSourceStatusProps = Pick<
  ExecutiveHomeViewModel,
  "dataStatus" | "sourceFailures"
>

export function ExecutiveSourceStatus({
  dataStatus,
  sourceFailures,
}: ExecutiveSourceStatusProps) {
  if (dataStatus === "complete") {
    return null
  }

  return (
    <section
      aria-labelledby="executive-source-status-title"
      className="rounded-xl border border-amber-200 bg-amber-50 p-6"
    >
      <h2 id="executive-source-status-title" className="text-lg font-semibold">
        Dados parciais
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Algumas fontes estão indisponíveis. Os dados disponíveis não foram
        substituídos por zero nem interpretados como estado saudável.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
        {sourceFailures.map((failure) => (
          <li key={failure.source}>
            {failure.sourceLabel} — {failure.kind === "failure"
              ? "Falha de leitura"
              : "Indisponível"}
          </li>
        ))}
      </ul>
    </section>
  )
}
