import type { ReactNode } from "react"

type EmployeeProfileLayoutProps = {
  sidebar: ReactNode
  header: ReactNode
  summary?: ReactNode
  children: ReactNode
}

export function EmployeeProfileLayout({
  sidebar,
  header,
  summary,
  children,
}: EmployeeProfileLayoutProps) {
  return (
    <div className="space-y-8">
      <div className="grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="min-w-0">{sidebar}</aside>

        <div className="min-w-0 space-y-6">
          {header}
          {summary}
        </div>
      </div>

      <main className="min-w-0 space-y-8">{children}</main>
    </div>
  )
}
