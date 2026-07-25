"use client"

import { Building2 } from "lucide-react"

import { Button } from "@/components/ui/button"

import type {
  ProjectedDepartmentSelectorOption,
} from "../../selectors"

type DepartmentUpdateSelectorProps = {
  departments:
    readonly ProjectedDepartmentSelectorOption[]
  onSelect: (
    department: ProjectedDepartmentSelectorOption
  ) => void
  onCancel?: () => void
}

function sortDepartments(
  departments:
    readonly ProjectedDepartmentSelectorOption[]
) {
  return [...departments]
    .filter(
      (department) =>
        department.status === "active"
    )
    .sort((left, right) =>
      left.name.localeCompare(
        right.name,
        "pt-BR",
        {
          sensitivity: "base",
        }
      )
    )
}

function getLabel(
  department:
    ProjectedDepartmentSelectorOption
) {
  if (!department.code) {
    return department.name
  }

  return `${department.name} (${department.code})`
}

export function DepartmentUpdateSelector({
  departments,
  onSelect,
  onCancel,
}: DepartmentUpdateSelectorProps) {
  const activeDepartments =
    sortDepartments(departments)

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-muted/20 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-background">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>

          <div>
            <h3 className="font-medium">
              Atualizar departamento
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Escolha qual departamento será alterado.
            </p>
          </div>
        </div>
      </div>

      {activeDepartments.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Não existem departamentos ativos
          disponíveis.
        </div>
      ) : (
        <div className="space-y-2">
          {activeDepartments.map(
            (department) => (
              <Button
                key={department.id}
                type="button"
                variant="outline"
                className={[
                  "h-auto w-full justify-start",
                  "rounded-xl p-4 text-left",
                  "whitespace-normal",
                ].join(" ")}
                onClick={() =>
                  onSelect(department)
                }
              >
                <span className="block">
                  <span className="block font-medium">
                    {getLabel(department)}
                  </span>

                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    Selecionar este departamento
                    para edição.
                  </span>
                </span>
              </Button>
            )
          )}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
        >
          Voltar
        </Button>
      </div>
    </div>
  )
}
