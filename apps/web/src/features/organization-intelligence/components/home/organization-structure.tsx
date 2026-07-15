import type { OrganizationStructure } from "../../types/organization-structure"

type Props = {
  structure: OrganizationStructure
}

function Card({
  title,
  value,
}: {
  title: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <p className="text-sm text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>
    </div>
  )
}

export function OrganizationStructure({
  structure,
}: Props) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          Estrutura Organizacional
        </h2>

        <p className="text-sm text-muted-foreground">
          Distribuição atual da empresa.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Departamentos"
          value={structure.departments}
        />

        <Card
          title="Cargos"
          value={structure.positions}
        />

        <Card
          title="Média de cargos por departamento"
          value={structure.averagePositionsPerDepartment}
        />
      </div>
    </section>
  )
}
