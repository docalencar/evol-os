import type { ReactNode } from "react"

type AssessmentSectionAccordionProps = {
  title: string
  description?: string | null
  answered: number
  total: number
  defaultOpen?: boolean
  children: ReactNode
}

export function AssessmentSectionAccordion({
  title,
  description,
  answered,
  total,
  defaultOpen = false,
  children,
}: AssessmentSectionAccordionProps) {
  const completed = total > 0 && answered === total

  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-xl border bg-card"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">
              {title}
            </h2>

            <span
              className={
                completed
                  ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                  : "rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
              }
            >
              {answered}/{total}
            </span>
          </div>

          {description ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        <span className="text-sm font-medium text-muted-foreground transition-transform group-open:rotate-180">
          ↓
        </span>
      </summary>

      <div className="border-t p-6">
        {children}
      </div>
    </details>
  )
}
