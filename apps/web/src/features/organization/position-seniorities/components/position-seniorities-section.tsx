import Link from "next/link"

import { DashboardSection } from "@/components/dashboard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

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
        <div className="flex flex-wrap items-center gap-2">
          {/* Optional bridge to the company Seniority catalog. Seniority is
              optional enrichment — this is a management destination, never a
              requirement. The Seniority page re-validates the origin as a UUID,
              so the back link can only resolve to this Position. */}
          <Link
            href={`/app/company/seniority?fromPositionId=${encodeURIComponent(positionId)}`}
          >
            <Button variant="secondary">Gerenciar senioridades</Button>
          </Link>

          {available.length > 0 ? (
            <AddPositionSeniorityDialog
              positionId={positionId}
              available={available}
            />
          ) : null}
        </div>
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
