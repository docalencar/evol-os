import { ProductWizardSummary } from "@/components/product"

export type SeniorityLevelOption = {
  id: string
  label: string
}

type PositionSenioritiesStepProps = {
  seniorityLevels: SeniorityLevelOption[]
  selectedIds: string[]
  onToggle: (id: string) => void
}

// Applicable-seniority selection for a Cargo. Options are the company's ACTIVE
// seniority catalog (Empresa → Senioridades); an empty selection means the cargo
// uses no specific seniority. The structural anchor profile is never listed.
export function PositionSenioritiesStep({
  seniorityLevels,
  selectedIds,
  onToggle,
}: PositionSenioritiesStepProps) {
  if (seniorityLevels.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma senioridade ativa no catálogo da empresa. Cadastre senioridades em
        Empresa → Senioridades para poder aplicá-las a este cargo.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        Selecione, a partir do catálogo de senioridades da empresa, os níveis
        aplicáveis a este cargo. Sem seleção, o cargo não utiliza senioridade
        específica.
      </p>

      <ul className="flex flex-col gap-2">
        {seniorityLevels.map((level) => {
          const checked = selectedIds.includes(level.id)

          return (
            <li key={level.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-900">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={() => onToggle(level.id)}
                />
                {level.label}
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type PositionSenioritiesSummaryProps = {
  labels: string[]
}

export function PositionSenioritiesSummary({
  labels,
}: PositionSenioritiesSummaryProps) {
  return (
    <ProductWizardSummary>
      {labels.length > 0
        ? labels.join(" · ")
        : "Sem senioridade específica"}
    </ProductWizardSummary>
  )
}
