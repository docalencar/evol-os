import type { ReactNode } from "react"

type AssessmentPageHeaderProps = {
  title: string
  description: string
  actions?: ReactNode
}

export function AssessmentPageHeader({
  title,
  description,
  actions,
}: AssessmentPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {title}
        </h1>

        <p className="text-muted-foreground">
          {description}
        </p>
      </div>

      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}
