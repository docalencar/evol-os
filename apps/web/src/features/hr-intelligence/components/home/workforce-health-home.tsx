import type { WorkforceHealthViewModel } from "../../view-models/workforce-health-view-model"

type WorkforceHealthHomeProps = {
  viewModel: WorkforceHealthViewModel
}

function MetricCard({
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

export function WorkforceHealthHome({
  viewModel,
}: WorkforceHealthHomeProps) {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">
          HR Intelligence
        </h1>

        <p className="mt-2 text-muted-foreground">
          Saúde da força de trabalho da organização.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Colaboradores"
          value={viewModel.totalEmployees}
        />

        <MetricCard
          title="Saudáveis"
          value={viewModel.healthyEmployees}
        />

        <MetricCard
          title="Em atenção"
          value={viewModel.attentionEmployees}
        />

        <MetricCard
          title="Críticos"
          value={viewModel.criticalEmployees}
        />
      </div>

      {viewModel.empty && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            Ainda não existem colaboradores suficientes para gerar indicadores.
          </p>
        </div>
      )}
    </div>
  )
}
