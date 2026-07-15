import type { EmployeeNextAction } from "../types/employee-next-action"

type EmployeeNextActionsCardProps = {
  actions: EmployeeNextAction[]
}

export function EmployeeNextActionsCard({
  actions,
}: EmployeeNextActionsCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          Próximas ações
        </h2>

        <p className="text-sm text-muted-foreground">
          Recomendações para apoiar o desenvolvimento deste colaborador.
        </p>
      </div>

      <div className="space-y-3">
        {actions.map((action) => (
          <div
            key={action.id}
            className="rounded-lg border p-3"
          >
            <div className="font-medium">
              {action.title}
            </div>

            <p className="mt-1 text-sm text-muted-foreground">
              {action.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
