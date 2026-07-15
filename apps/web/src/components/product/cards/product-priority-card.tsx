import { Card } from "@/components/ui/card"

import type { ProductPriority } from "../types/product-priority"

type ProductPriorityCardProps = {
  priority: ProductPriority
}

const severityClasses = {
  info: "border-l-4 border-l-sky-500",
  success: "border-l-4 border-l-green-500",
  warning: "border-l-4 border-l-amber-500",
  danger: "border-l-4 border-l-red-500",
} satisfies Record<ProductPriority["severity"], string>

export function ProductPriorityCard({
  priority,
}: ProductPriorityCardProps) {
  return (
    <Card className={severityClasses[priority.severity]}>
      <div className="space-y-3 p-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            {priority.title}
          </p>

          <p className="mt-2 text-base leading-7">
            {priority.message}
          </p>
        </div>

        {priority.actionLabel ? (
          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
          >
            {priority.actionLabel}
          </button>
        ) : null}
      </div>
    </Card>
  )
}
