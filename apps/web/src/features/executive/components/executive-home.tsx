import { KPIDashboardPage } from "@/features/kpi-dashboard/components"

import type { ExecutiveHomeViewModel } from "../types"
import { ExecutiveDecisionFeed } from "./executive-decision-feed"
import { ExecutiveEmptyState } from "./executive-empty-state"
import { ExecutiveInsights } from "./executive-insights"
import { ExecutiveNarrative } from "./executive-narrative"
import { ExecutiveQuickActions } from "./executive-quick-actions"
import { ExecutiveSummary } from "./executive-summary"
import { ExecutiveSourceStatus } from "./executive-source-status"
import { ExecutiveUnavailableCapabilities } from "./executive-unavailable-capabilities"

type ExecutiveHomeProps = {
  data: ExecutiveHomeViewModel
}

export function ExecutiveHome({
  data,
}: ExecutiveHomeProps) {
  return (
    <div className="space-y-8">
      <ExecutiveSummary brief={data.brief} />

      <ExecutiveNarrative narrative={data.narrative} />

      <ExecutiveSourceStatus
        dataStatus={data.dataStatus}
        sourceFailures={data.sourceFailures}
      />

      <ExecutiveQuickActions />

      {data.isEmpty ? (
        <ExecutiveEmptyState />
      ) : (
        <>
          <ExecutiveDecisionFeed feed={data.decisionFeed} />

          <ExecutiveInsights brief={data.brief} />

          <KPIDashboardPage dashboard={data.dashboard} />
        </>
      )}

      <ExecutiveUnavailableCapabilities />
    </div>
  )
}
