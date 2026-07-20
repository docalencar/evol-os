import type { ReactNode } from "react"

import { cn } from "@/utils/cn"

type ProductWizardFooterProps = {
  children: ReactNode
  className?: string
}

export function ProductWizardFooter({
  children,
  className,
}: ProductWizardFooterProps) {
  return (
    <footer
      className={cn(
        "sticky bottom-0 z-10 mt-5 flex shrink-0 items-center justify-end gap-2 border-t bg-background px-1 pt-4",
        className
      )}
    >
      {children}
    </footer>
  )
}
