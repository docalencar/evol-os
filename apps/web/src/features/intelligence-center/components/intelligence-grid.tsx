import type { ReactNode } from "react"

type IntelligenceGridProps = {
  children: ReactNode
}

export function IntelligenceGrid({ children }: IntelligenceGridProps) {
  return (
    <section
      aria-label="Indicadores principais"
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      {children}
    </section>
  )
}
