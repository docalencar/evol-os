"use client"

import type { PlanningTimelineItemViewModel } from "../timeline"

export function ScenarioSelector({ scenarios, currentScenarioId }: { scenarios: readonly PlanningTimelineItemViewModel[]; currentScenarioId: string }) {
  return <label className="block text-sm font-medium text-slate-700">Cenário<select aria-label="Selecionar cenário executivo" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2" value={currentScenarioId} onChange={(event) => { window.location.href = `/app/organization/planning/${event.target.value}/executive` }}>{scenarios.map((scenario) => <option key={scenario.id} value={scenario.id}>{scenario.name} · {scenario.statusLabel}</option>)}</select></label>
}
