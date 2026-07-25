import {
  AlertTriangle,
  CheckCircle2,
} from "lucide-react"

import type {
  ProjectionIssue,
} from "../../projection"

type ProjectionWarningListProps = {
  warnings: readonly ProjectionIssue[]
}

export function ProjectionWarningList({
  warnings,
}: ProjectionWarningListProps) {
  if (warnings.length === 0) {
    return (
      <aside className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-100 p-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </div>

          <div>
            <h3 className="font-semibold text-emerald-950">
              Nenhum alerta identificado
            </h3>

            <p className="mt-1 text-sm leading-6 text-emerald-800">
              A projeção não encontrou riscos que exijam
              atenção neste momento.
            </p>
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-amber-100 p-2">
          <AlertTriangle className="h-5 w-5 text-amber-700" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-amber-950">
            {warnings.length}{" "}
            {warnings.length === 1
              ? "alerta identificado"
              : "alertas identificados"}
          </h3>

          <p className="mt-1 text-sm leading-6 text-amber-800">
            Revise os pontos abaixo antes de confirmar o
            cenário.
          </p>

          <ul className="mt-4 space-y-3">
            {warnings.map((warning, index) => (
              <li
                key={`${warning.code}-${warning.changeSetId ?? index}`}
                className="rounded-xl border border-amber-200/80 bg-white/60 p-3"
              >
                <p className="text-sm font-medium text-amber-950">
                  {warning.message}
                </p>

                <p className="mt-1 text-xs text-amber-700">
                  Código: {warning.code}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}
