import Link from "next/link"

import { Button } from "@/components/ui/button"

const actions = [
  {
    label: "Abrir planejamento",
    href: "/app/organization",
  },
  {
    label: "Ver indicadores",
    href: "/app/indicators",
  },
  {
    label: "Consultar pessoas",
    href: "/app/people",
  },
  {
    label: "Acessar recrutamento",
    href: "/app/recruitment",
  },
] as const

export function ExecutiveQuickActions() {
  return (
    <section
      aria-labelledby="executive-quick-actions-title"
      className="rounded-xl border bg-card p-6"
    >
      <div>
        <h2
          id="executive-quick-actions-title"
          className="text-lg font-semibold"
        >
          Ações rápidas
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Acesse os principais centros de decisão do Evol OS.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {actions.map((action) => (
          <Button
            key={action.href}
            variant="outline"
            render={<Link href={action.href} />}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </section>
  )
}