import { Card } from "@/components/ui/card"

type ProductInsightListProps = {
  title: string
  insights: string[]
}

export function ProductInsightList({
  title,
  insights,
}: ProductInsightListProps) {
  return (
    <Card>
      <div className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">
          {title}
        </h2>

        <ul className="space-y-2">
          {insights.map((insight) => (
            <li
              key={insight}
              className="text-sm text-muted-foreground"
            >
              • {insight}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
