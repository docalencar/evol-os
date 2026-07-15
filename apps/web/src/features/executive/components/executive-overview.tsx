import type { ExecutiveOverview } from "../types/executive-overview"

type Props = {
  overview: ExecutiveOverview
}

function Card({
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

export function ExecutiveOverview({
  overview,
}: Props) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">
          Executive Overview
        </h1>

        <p className="text-muted-foreground">
          Visão consolidada do MVP.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Colaboradores"
          value={overview.totalEmployees}
        />

        <Card
          title="Críticos"
          value={overview.criticalEmployees}
        />

        <Card
          title="Riscos"
          value={overview.organizationalRisks}
        />

        <Card
          title="Sugestões IA"
          value={overview.aiSuggestions}
        />
      </div>
    </div>
  )
}
