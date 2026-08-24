import React from "react"

export function AssessmentResultUnavailableState() {
  return (
    <section className="rounded-xl border border-dashed bg-card p-8 text-center">
      <h1 className="text-xl font-semibold">Resultado ainda não disponível</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        Este resultado não está disponível conforme a política do ciclo.
      </p>
    </section>
  )
}
