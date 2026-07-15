import type {
  EmployeeImportMappingResult,
} from "../types/employee-import-mapping"

type EmployeeImportMappingSummaryProps = {
  mapping: EmployeeImportMappingResult
}

export function EmployeeImportMappingSummary({
  mapping,
}: EmployeeImportMappingSummaryProps) {
  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Mapeamento automático
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            O Evol OS interpretou as colunas
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            {mapping.mappedCount} coluna
            {mapping.mappedCount === 1 ? "" : "s"} reconhecida
            {mapping.mappedCount === 1 ? "" : "s"} e{" "}
            {mapping.unmappedCount} não reconhecida
            {mapping.unmappedCount === 1 ? "" : "s"}.
          </p>
        </div>

        <span
          className={[
            "w-fit rounded-full px-3 py-1 text-xs font-semibold",
            mapping.isReadyForPreview
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700",
          ].join(" ")}
        >
          {mapping.isReadyForPreview
            ? "Mapeamento válido"
            : "Revisão necessária"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {mapping.mappings.map((item) => (
          <div
            key={`${item.sourceHeader}-${item.columnIndex}`}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-950">
                {item.sourceHeader}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Coluna {item.columnIndex + 1}
              </p>
            </div>

            <div className="shrink-0 text-right">
              {item.fieldLabel ? (
                <>
                  <p className="text-sm font-semibold text-emerald-700">
                    {item.fieldLabel}
                  </p>

                  {item.required ? (
                    <p className="mt-1 text-xs text-slate-500">
                      Obrigatório
                    </p>
                  ) : null}
                </>
              ) : (
                <p className="text-sm font-medium text-slate-500">
                  Ignorada
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {!mapping.hasRequiredFullName ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4"
        >
          <p className="text-sm font-semibold text-amber-800">
            A coluna de nome não foi encontrada.
          </p>

          <p className="mt-1 text-sm leading-6 text-amber-700">
            Renomeie uma coluna para Nome, Nome completo, Colaborador ou
            Funcionário e processe a planilha novamente.
          </p>
        </div>
      ) : null}
    </section>
  )
}
