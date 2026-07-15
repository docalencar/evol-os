import type {
  EmployeeImportPreview,
} from "../types/employee-import-preview"

type EmployeeImportPreviewTableProps = {
  preview: EmployeeImportPreview
}

function getSourceLabel(
  preview: EmployeeImportPreview
) {
  if (preview.format === "xlsx") {
    return "Excel"
  }

  switch (preview.delimiter) {
    case ";":
      return "CSV · Ponto e vírgula"

    case "\t":
      return "CSV · Tabulação"

    default:
      return "CSV · Vírgula"
  }
}

export function EmployeeImportPreviewTable({
  preview,
}: EmployeeImportPreviewTableProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Arquivo processado
          </p>

          <h2 className="mt-1 text-lg font-semibold text-slate-950">
            Prévia da planilha
          </h2>

          <p className="mt-1 text-sm text-slate-600">
            {preview.totalRows} colaborador
            {preview.totalRows === 1 ? "" : "es"} encontrado
            {preview.totalRows === 1 ? "" : "s"}.
          </p>
        </div>

        <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
          Formato:{" "}
          <span className="font-semibold text-slate-900">
            {getSourceLabel(preview)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold text-slate-600">
                Linha
              </th>

              {preview.headers.map((header, index) => (
                <th
                  key={`${header}-${index}`}
                  className="min-w-40 whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold text-slate-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {preview.rows
              .slice(0, preview.previewLimit)
              .map((row) => (
              <tr key={row.rowNumber}>
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-500">
                  {row.rowNumber}
                </td>

                {preview.headers.map((_, columnIndex) => (
                  <td
                    key={`${row.rowNumber}-${columnIndex}`}
                    className="max-w-72 whitespace-nowrap px-4 py-3 text-slate-700"
                  >
                    <span
                      className="block truncate"
                      title={row.values[columnIndex]}
                    >
                      {row.values[columnIndex] || "—"}
                    </span>
                  </td>
                ))}
              </tr>
              ))}
          </tbody>
        </table>
      </div>

      {preview.totalRows > preview.previewLimit ? (
        <p className="text-xs text-slate-500">
          Exibindo as primeiras {preview.previewLimit} linhas de{" "}
          {preview.totalRows}.
        </p>
      ) : null}
    </section>
  )
}
