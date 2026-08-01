export function ExecutiveEmptyState() {
  return (
    <section
      aria-labelledby="executive-empty-state-title"
      className="rounded-xl border border-dashed bg-card p-8 text-center"
    >
      <h2
        id="executive-empty-state-title"
        className="text-lg font-semibold"
      >
        Visão executiva ainda sem dados
      </h2>

      <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
        Os indicadores, alertas e recomendações aparecerão aqui quando as
        primeiras informações da organização forem processadas.
      </p>
    </section>
  )
}