import { ReactNode } from "react"

type Item = {
  label: string
  value: ReactNode
}

type KeyValueListProps = {
  items: Item[]
}

export function KeyValueList({
  items,
}: KeyValueListProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center justify-between gap-6 border-b border-slate-100 pb-3 last:border-0 last:pb-0"
        >
          <span className="text-sm text-slate-500">
            {item.label}
          </span>

          <span className="text-sm font-medium text-slate-900 text-right">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
