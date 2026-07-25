import {
  CircleX,
} from "lucide-react"

import type {
  ProjectionIssue,
} from "../../projection"

type ProjectionErrorListProps = {
  errors: readonly ProjectionIssue[]
}

export function ProjectionErrorList({
  errors,
}: ProjectionErrorListProps) {
  if (errors.length === 0) {
    return null
  }

  return (
    <aside className="rounded-2xl border border-red-200 bg-red-50/70 p-5">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-xl bg-red-100 p-2">
          <CircleX className="h-5 w-5 text-red-700" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-red-950">
            Projeção inválida
          </h3>

          <p className="mt-1 text-sm leading-6 text-red-800">
            Existem erros estruturais que impedem a aprovação
            deste cenário.
          </p>

          <ul className="mt-4 space-y-3">
            {errors.map((error, index) => (
              <li
                key={`${error.code}-${error.changeSetId ?? index}`}
                className="rounded-xl border border-red-200/80 bg-white/60 p-3"
              >
                <p className="text-sm font-medium text-red-950">
                  {error.message}
                </p>

                <p className="mt-1 text-xs text-red-700">
                  Código: {error.code}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  )
}
