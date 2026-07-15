import type {
  EmployeeImportRowStatus,
  EmployeeImportValidationResult,
} from "../types/employee-import-validation"

type EmployeeImportValidationSummaryProps = {
  validation: EmployeeImportValidationResult
}

function getStatusLabel(status: EmployeeImportRowStatus) {
  switch (status) {
    case "valid":
      return "Pronto"

    case "warning":
      return "Atenção"

    case "invalid":
      return "Inválido"
  }
}

function getStatusClasses(status: EmployeeImportRowStatus) {
  switch (status) {
    case "valid":
      return "bg-emerald-50 text-emerald-700"

    case "warning":
      return "bg-amber-50 text-amber-700"

    case "invalid":
      return "bg-red-50 text-red-700"
  }
}

export function EmployeeImportValidationSummary({
  validation,
}: EmployeeImportValidationSummaryProps) {
  const visibleRows = validation.rows.slice(0, 10)

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Revisão inteligente
        </p>

        <h2 className="mt-1 text-lg font-semibold text-slate-950">
          Resultado da análise
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Revise os alertas antes de confirmar a importação.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-2xl font-bold text-slate-950">
            {validation.totalRows}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Encontrados
          </p>
        </div>

        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-2xl font-bold text-emerald-700">
            {validation.validRows}
          </p>
          <p className="mt-1 text-sm text-emerald-700">
            Prontos
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 p-4">
          <p className="text-2xl font-bold text-amber-700">
            {validation.warningRows}
          </p>
          <p className="mt-1 text-sm text-amber-700">
            Com alertas
          </p>
        </div>

        <div className="rounded-xl bg-red-50 p-4">
          <p className="text-2xl font-bold text-red-700">
            {validation.invalidRows}
          </p>
          <p className="mt-1 text-sm text-red-700">
            Inválidos
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {visibleRows.map((row) => (
          <article
            key={row.rowNumber}
            className="rounded-xl border border-slate-200 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  Linha {row.rowNumber}
                </p>

                <p className="mt-1 truncate font-semibold text-slate-950">
                  {row.fullName || "Nome não informado"}
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  {row.email || "Sem e-mail"}
                  {row.position
                    ? ` · ${row.position}`
                    : ""}
                  {row.department
                    ? ` · ${row.department}`
                    : ""}
                </p>
              </div>

              <span
                className={[
                  "w-fit rounded-full px-3 py-1 text-xs font-semibold",
                  getStatusClasses(row.status),
                ].join(" ")}
              >
                {getStatusLabel(row.status)}
              </span>
            </div>

            {row.issues.length > 0 ? (
              <div className="mt-4 space-y-2">
                {row.issues.map((issue, index) => (
                  <div
                    key={`${row.rowNumber}-${issue.fieldLabel}-${index}`}
                    className={[
                      "rounded-lg px-3 py-2 text-sm",
                      issue.severity === "error"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700",
                    ].join(" ")}
                  >
                    <span className="font-semibold">
                      {issue.fieldLabel}:
                    </span>{" "}
                    {issue.message}
                  </div>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>

      {validation.totalRows > visibleRows.length ? (
        <p className="text-xs text-slate-500">
          Exibindo as primeiras {visibleRows.length} linhas de{" "}
          {validation.totalRows}.
        </p>
      ) : null}
    </section>
  )
}
