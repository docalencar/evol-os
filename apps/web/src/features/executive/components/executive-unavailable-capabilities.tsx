const unavailableCapabilities = [
  "Turnover",
  "Clima",
  "Desempenho agregado",
  "Potencial e Nine Box",
  "Sucessão",
  "Planos estratégicos",
] as const

export function ExecutiveUnavailableCapabilities() {
  return (
    <section
      aria-labelledby="executive-unavailable-title"
      className="rounded-xl border bg-card p-6"
    >
      <h2 id="executive-unavailable-title" className="text-lg font-semibold">
        Capacidades ainda indisponíveis
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Estas capacidades da Jornada 6 ainda não possuem contrato executivo
        factual concluído.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {unavailableCapabilities.map((capability) => (
          <li key={capability} className="rounded-lg border p-3 text-sm">
            <span className="font-medium">{capability}</span>
            <span className="ml-2 text-muted-foreground">Indisponível</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
