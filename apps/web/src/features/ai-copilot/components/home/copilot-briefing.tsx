import type { CopilotBriefing } from "../../types/copilot-briefing"

type Props = {
  briefing: CopilotBriefing
}

function Metric({
  title,
  value,
}: {
  title: string
  value: number
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  )
}

export function CopilotBriefing({
  briefing,
}: Props) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          Briefing do dia
        </h2>

        <p className="text-sm text-muted-foreground">
          Resumo consolidado da organização.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          title="Sugestões"
          value={briefing.totalSuggestions}
        />

        <Metric
          title="Ações gerenciais"
          value={briefing.managerActions}
        />

        <Metric
          title="Riscos"
          value={briefing.organizationalRisks}
        />

        <Metric
          title="Insights"
          value={briefing.workforceInsights}
        />
      </div>
    </section>
  )
}
