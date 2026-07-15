import type { OrganizationOverviewViewModel } from "../../view-models/organization-overview-view-model"

type Props = {
  viewModel: OrganizationOverviewViewModel
}

function Card({
  title,
  value,
}: {
  title: string
  value: number
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

export function OrganizationOverviewHome({
  viewModel,
}: Props) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">
          Organization Intelligence
        </h1>

        <p className="mt-2 text-muted-foreground">
          Visão geral da organização.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card
          title="Colaboradores"
          value={viewModel.totalEmployees}
        />

        <Card
          title="Departamentos"
          value={viewModel.departments}
        />

        <Card
          title="Cargos"
          value={viewModel.positions}
        />
      </div>
    </div>
  )
}
