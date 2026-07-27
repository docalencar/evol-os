import type {
  OrganizationStructure,
} from "../../types/organization-structure"


type Props = {
  structure: OrganizationStructure
}


function Card({
  title,
  value,
  description,
}: {
  title: string
  value: string | number
  description?: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5">

      <p className="text-sm text-muted-foreground">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold">
        {value}
      </p>

      {description && (
        <p className="mt-2 text-xs text-muted-foreground">
          {description}
        </p>
      )}

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
          Visão consolidada da estrutura da empresa.
        </p>
      </div>


      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <Card
          title="Unidades organizacionais"
          value={
            structure.organizationalUnits
          }
          description="Holdings e unidades de negócio."
        />


        <Card
          title="Departamentos"
          value={
            structure.departments
          }
          description="Áreas organizacionais cadastradas."
        />


        <Card
          title="Cargos"
          value={
            structure.positions
          }
          description="Posições existentes."
        />


        <Card
          title="Departamentos sem unidade"
          value={
            structure.departmentsWithoutUnit
          }
          description="Necessitam de organização."
        />

      </div>


      <div className="rounded-xl border bg-muted/30 p-4">

        <p className="text-sm font-medium">
          Distribuição de cargos
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Média de{" "}
          <strong>
            {structure.averagePositionsPerDepartment}
          </strong>{" "}
          cargos por departamento.
        </p>

      </div>

    </section>
  )
}
