import type { ReactNode } from "react"

import { CircleHelp } from "lucide-react"

import { cn } from "@/utils/cn"

type ProductWizardHelpProps = {
  label?: string
  children: ReactNode
  className?: string
}

export function ProductWizardHelp({
  label = "Entenda esta etapa",
  children,
  className,
}: ProductWizardHelpProps) {
  return (
    <details
      className={cn(
        "group rounded-lg border bg-muted/20",
        className
      )}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium">
        <CircleHelp className="h-4 w-4 text-muted-foreground" />
        {label}
      </summary>

      <div className="border-t px-3 py-3 text-sm leading-6 text-muted-foreground">
        {children}
      </div>
    </details>
  )
}
