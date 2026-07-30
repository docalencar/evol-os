import type { ReactNode } from "react"

import type { ExecutiveNavigationViewModel } from "./executive-navigation-view-model"
import { ExecutiveActionPanel } from "./executive-action-panel"
import { ExecutiveNavigation } from "./executive-navigation"
import { ExecutiveOverviewCard } from "./executive-overview-card"
import { ScenarioSelector } from "./scenario-selector"

export function ExecutiveLayout({ experience, children }: { experience: ExecutiveNavigationViewModel; children: ReactNode }) {
  const { dashboard, timeline } = experience
  return <div className="space-y-8 print:space-y-5"><header className="flex flex-col gap-5 border-b border-slate-200 pb-6 print:border-none"><div><p className="text-sm font-medium text-slate-500">Evol OS · Organization Planning</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Experiência Executiva</h1></div><ExecutiveNavigation scenarioId={dashboard.scenario.id} workspaceId={dashboard.scenario.workspaceId} /><div className="max-w-xl print:hidden"><ScenarioSelector scenarios={timeline.items} currentScenarioId={dashboard.scenario.id} /></div></header><div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]"><ExecutiveOverviewCard dashboard={dashboard} /><ExecutiveActionPanel scenarioId={dashboard.scenario.id} workspaceId={dashboard.scenario.workspaceId} /></div>{children}</div>
}
