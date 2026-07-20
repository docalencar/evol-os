const QUICK_ACTIONS = [
  "Resuma os principais riscos da organização",
  "Quais pessoas precisam de atenção?",
  "Mostre oportunidades de desenvolvimento",
  "Quais ações gerenciais são prioritárias?",
]

export function CopilotQuickActions() {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">
          Perguntas rápidas
        </h2>

        <p className="text-sm text-muted-foreground">
          Exemplos de análises que o Copilot poderá realizar.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            disabled
            className="rounded-xl border bg-card p-4 text-left text-sm text-muted-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-80"
          >
            {action}
          </button>
        ))}
      </div>
    </section>
  )
}
