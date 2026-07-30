const steps = ["Validação", "Resumo", "Impactos", "Confirmação"] as const

export function PublicationProgress({ current }: { current: number }) {
  return (
    <ol aria-label="Etapas da publicação" className="grid grid-cols-4 gap-2 text-xs">
      {steps.map((step, index) => (
        <li key={step} className={index <= current ? "font-semibold text-blue-700" : "text-slate-400"}>
          <span className="mb-1 block h-1.5 rounded-full bg-current" />{step}
        </li>
      ))}
    </ol>
  )
}
