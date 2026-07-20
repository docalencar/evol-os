import type { ReactNode } from "react"

import { cn } from "@/utils/cn"

type ProductWizardHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  className?: string
}

export function ProductWizardHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: ProductWizardHeaderProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-start justify-between gap-4 border-b px-1 pb-5",
        className
      )}
    >
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </p>
        ) : null}

        <h2 className="text-xl font-semibold tracking-tight">
          {title}
        </h2>

        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="shrink-0">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
