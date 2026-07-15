import { Button } from "@/components/ui/button"

type EmployeeWorkspacePaginationProps = {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
  firstItem: number
  lastItem: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

const PAGE_SIZE_OPTIONS = [
  10,
  25,
  50,
  100,
] as const

const selectClassName = [
  "h-9 rounded-md border border-slate-200 bg-white px-3",
  "text-sm text-slate-900 outline-none transition-colors",
  "focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
].join(" ")

export function EmployeeWorkspacePagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  firstItem,
  lastItem,
  onPageChange,
  onPageSizeChange,
}: EmployeeWorkspacePaginationProps) {
  if (totalItems === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-slate-700">
          Exibindo {firstItem}–{lastItem} de {totalItems}
        </p>

        <p className="text-xs text-slate-500">
          Página {currentPage} de {totalPages}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <label
            htmlFor="employee-page-size"
            className="text-sm text-slate-600"
          >
            Por página
          </label>

          <select
            id="employee-page-size"
            value={pageSize}
            onChange={(event) =>
              onPageSizeChange(Number(event.target.value))
            }
            className={selectClassName}
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option
                key={option}
                value={option}
              >
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={currentPage <= 1}
            onClick={() => onPageChange(currentPage - 1)}
          >
            Anterior
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={currentPage >= totalPages}
            onClick={() => onPageChange(currentPage + 1)}
          >
            Próxima
          </Button>
        </div>
      </div>
    </section>
  )
}
