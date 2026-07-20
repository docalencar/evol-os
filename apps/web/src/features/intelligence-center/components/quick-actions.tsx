import Link from "next/link"

export type QuickAction = {
  label: string
  description: string
  href: string
}

type QuickActionsProps = {
  actions: QuickAction[]
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Ações rápidas
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-950">
          Comece uma atividade
        </h2>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <span className="block text-sm font-semibold text-slate-900">
              {action.label}
            </span>

            <span className="mt-1 block text-sm leading-5 text-slate-600">
              {action.description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
