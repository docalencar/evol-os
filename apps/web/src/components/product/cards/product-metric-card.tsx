import { Card } from "@/components/ui/card"

type ProductMetricCardProps = {
  title: string
  value: number | string
}

export function ProductMetricCard({
  title,
  value,
}: ProductMetricCardProps) {
  return (
    <Card>
      <div className="space-y-2 p-6">
        <p className="text-sm text-muted-foreground">
          {title}
        </p>

        <p className="text-3xl font-bold">
          {value}
        </p>
      </div>
    </Card>
  )
}
