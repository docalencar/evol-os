import { ProductMetricCard } from "./product-metric-card"

type Metric = {
  title: string
  value: number | string
}

type ProductMetricGridProps = {
  metrics: Metric[]
}

export function ProductMetricGrid({
  metrics,
}: ProductMetricGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <ProductMetricCard
          key={metric.title}
          title={metric.title}
          value={metric.value}
        />
      ))}
    </div>
  )
}
