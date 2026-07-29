import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

type SnapshotCardData = {
  id: string
  version: number
  publishedAt: Date
  sourceScenarioId?: string | null
}

type SnapshotCardProps = {
  snapshot: SnapshotCardData
}

const dateFormatter = new Intl.DateTimeFormat(
  "pt-BR",
  {
    dateStyle: "medium",
  }
)

export function SnapshotCard({
  snapshot,
}: SnapshotCardProps) {
  const isInitialSnapshot =
    !snapshot.sourceScenarioId

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">
            Versão {snapshot.version}
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Publicada em{" "}
            {dateFormatter.format(
              snapshot.publishedAt
            )}
          </p>
        </div>

        <Badge className="shrink-0">
          {isInitialSnapshot
            ? "Base inicial"
            : "Cenário publicado"}
        </Badge>
      </div>

      <dl className="mt-5 border-t border-slate-100 pt-5">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Origem
          </dt>

          <dd
            className="mt-1 truncate text-sm font-medium text-slate-700"
            title={
              snapshot.sourceScenarioId ??
              snapshot.id
            }
          >
            {snapshot.sourceScenarioId
              ? `Cenário ${snapshot.sourceScenarioId}`
              : "Snapshot inicial do workspace"}
          </dd>
        </div>
      </dl>
    </Card>
  )
}
