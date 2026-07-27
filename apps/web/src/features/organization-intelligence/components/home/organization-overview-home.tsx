import type {
  OrganizationOverviewViewModel,
} from "../../view-models/organization-overview-view-model"


type Props = {
  viewModel: OrganizationOverviewViewModel
}


function Card({
  title,
  value,
  description,
}: {
  title: string
  value: number
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


export function OrganizationOverviewHome({
  viewModel,
}: Props) {
  return (
    <div className="space-y-8">

      <header>
        <h1 className="text-3xl font-bold">
          Inteligência Organizacional
        </h1>

        <p className="mt-2 text-muted-foreground">
          Visão geral da estrutura da organização.
        </p>
      </header>


      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">

        <Card
          title="Colaboradores"
          value={
            viewModel.totalEmployees
          }
        />


        <Card
          title="Unidades organizacionais"
          value={
            viewModel.organizationalUnits
          }
          description="Holdings e unidades de negócio."
        />


        <Card
          title="Departamentos"
          value={
            viewModel.departments
          }
        />


        <Card
          title="Cargos"
          value={
            viewModel.positions
          }
        />


        <Card
          title="Departamentos sem unidade"
          value={
            viewModel.departmentsWithoutUnit
          }
          description="Pendências de organização."
        />

      </div>

    </div>
  )
}
