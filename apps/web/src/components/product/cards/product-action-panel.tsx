import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"

export type ProductAction = {
  id: string
  label: string
  action: ReactNode
}

type ProductActionPanelProps = {
  title: string
  actions: ProductAction[]
}

export function ProductActionPanel({
  title,
  actions,
}: ProductActionPanelProps) {
  return (
    <Card>
      <div className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">
          {title}
        </h2>

        <div className="flex flex-wrap gap-3">
          {actions.map((item) => (
            <div key={item.id}>
              {item.action}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
