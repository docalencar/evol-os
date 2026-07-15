import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"

type AssessmentMetricCardProps = {
  title: string
  value: ReactNode
  description?: string
  icon?: ReactNode
}

export function AssessmentMetricCard({
  title,
  value,
  description,
  icon,
}: AssessmentMetricCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>

          <div className="text-3xl font-bold">{value}</div>

          {description ? (
            <p className="text-xs text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {icon ? (
          <div className="text-muted-foreground">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
