import type { ReactNode } from "react"

type WorkspaceLayoutProps = {
  children: ReactNode
}

export function WorkspaceLayout({
  children,
}: WorkspaceLayoutProps) {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8">
      {children}
    </main>
  )
}
