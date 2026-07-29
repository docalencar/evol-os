import { History } from "lucide-react"

import { DashboardEmptyState } from "@/components/dashboard"

import { SnapshotCard } from "./snapshot-card"

type SnapshotListItem = {
  id: string
  version: number
  publishedAt: Date
  sourceScenarioId?: string | null
}

type SnapshotListProps = {
  snapshots: readonly SnapshotListItem[]
}

export function SnapshotList({
  snapshots,
}: SnapshotListProps) {
  if (snapshots.length === 0) {
    return (
      <DashboardEmptyState
        title="Nenhuma versão publicada"
        description="As versões oficiais da estrutura organizacional aparecerão aqui depois da primeira publicação."
        icon={
          <History
            className="h-5 w-5"
            aria-hidden="true"
          />
        }
      />
    )
  }

  const orderedSnapshots = [...snapshots].sort(
    (first, second) =>
      second.version - first.version
  )

  return (
    <div className="grid gap-4">
      {orderedSnapshots.map((snapshot) => (
        <SnapshotCard
          key={snapshot.id}
          snapshot={snapshot}
        />
      ))}
    </div>
  )
}