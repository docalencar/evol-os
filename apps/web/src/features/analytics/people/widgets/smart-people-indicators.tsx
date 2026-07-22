import type {
  SmartPeopleIndicatorsViewModel,
} from "../types/smart-indicator"
import { SmartIndicatorCard } from "./smart-indicator-card"

type SmartPeopleIndicatorsProps = {
  dashboard: SmartPeopleIndicatorsViewModel
}

export function SmartPeopleIndicatorsWidget({
  dashboard,
}: SmartPeopleIndicatorsProps) {
  return (
    <section aria-labelledby="movement-efficiency-title">
      <div className="mb-4">
        <h2
          id="movement-efficiency-title"
          className="text-lg font-semibold text-slate-900"
        >
          Movimentação e eficiência
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Indicadores do mês atual comparados ao mês anterior.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.indicators.map((indicator) => (
          <SmartIndicatorCard
            key={indicator.id}
            indicator={indicator}
          />
        ))}
      </div>
    </section>
  )
}
