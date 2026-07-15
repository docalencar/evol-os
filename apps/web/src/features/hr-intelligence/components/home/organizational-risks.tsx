import type { OrganizationalRisk } from "../../types/organizational-risk"
import type { OrganizationalRisksViewModel } from "../../view-models/organizational-risks-view-model"

type OrganizationalRisksProps = {
  viewModel: OrganizationalRisksViewModel
}

const severityLabels: Record<
  OrganizationalRisk["severity"],
  string
> = {
  low: "Baixo",
  medium: "Médio",
  high: "Alto",
}

const severityClassNames: Record<
  OrganizationalRisk["severity"],
  string
> = {
  low: "border-emerald-200 bg-emerald-50 text-emerald-700",
  medium: "border-amber-200 bg-amber-50 text-amber-700",
  high: "border-red-200 bg-red-50 text-red-700",
}

export function OrganizationalRisks({
  viewModel,
}: OrganizationalRisksProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">
          Riscos organizacionais
        </h2>

        <p className="text-sm text-muted-foreground">
          Situações que precisam de acompanhamento do RH.
        </p>
      </div>

      {viewModel.empty ? (
        <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum risco organizacional identificado.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {viewModel.risks.map((risk) => (
            <article
              key={`${risk.severity}-${risk.title}`}
              className="rounded-xl border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="font-semibold">
                  {risk.title}
                </h3>

                <span
                  className={[
                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                    severityClassNames[risk.severity],
                  ].join(" ")}
                >
                  {severityLabels[risk.severity]}
                </span>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                {risk.description}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
