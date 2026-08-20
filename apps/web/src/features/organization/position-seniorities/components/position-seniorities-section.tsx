import { DashboardSection } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"

import type { PositionSenioritiesViewModel } from "../presenters/present-position-seniorities"
import { AddPositionSeniorityDialog } from "./add-position-seniority-dialog"
import { RemovePositionSeniorityButton } from "./remove-position-seniority-button"

type PositionSenioritiesSectionProps = {
  positionId: string
} & PositionSenioritiesViewModel

export function PositionSenioritiesSection({
  positionId,
  applicable,
  available,
}: PositionSenioritiesSectionProps) {
  return (
    <DashboardSection
      title="Senioridades aplicáveis a este cargo"
      description="Escolha, a partir do catálogo de senioridades da empresa (Empresa → Senioridades), quais níveis se aplicam a este cargo. Apenas as senioridades aplicadas aqui ficam disponíveis para as pessoas deste cargo. Senioridade indica o grau de experiência dentro do cargo — é diferente do nível hierárquico."
      actions={
        available.length > 0 ? (
          <AddPositionSeniorityDialog
            positionId={positionId}
            available={available}
          />
        ) : undefined
      }
    >
      {applicable.length === 0 ? (
        <p className="text-sm text-slate-600">
          Este cargo não utiliza senioridade específica.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {applicable.map((item) => (
            <li
              key={item.profileId}
              className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {item.code ? <Badge>{item.code}</Badge> : null}

                <span className="text-sm text-slate-900">{item.label}</span>
              </div>

              <RemovePositionSeniorityButton
                positionId={positionId}
                profileId={item.profileId}
              />
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  )
}
