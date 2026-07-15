import type { ReactNode } from "react"

import { Card } from "@/components/ui/card"

type DataTableColumn<T> = {
  key: string
  header: ReactNode
  render: (item: T) => ReactNode
}

type DataTableProps<T> = {
  title?: string
  data: T[]
  rowKey: (item: T) => string
  columns: DataTableColumn<T>[]
  emptyMessage?: string
}

export function DataTable<T>({
  title,
  data,
  rowKey,
  columns,
  emptyMessage = "Nenhum registro encontrado.",
}: DataTableProps<T>) {
  return (
    <Card>
      {title ? (
        <h3 className="text-lg font-semibold text-slate-900">
          {title}
        </h3>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-max border-collapse">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-left text-sm font-medium text-slate-700"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="bg-white">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={rowKey(item)}
                  className="border-t border-slate-200"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3 align-middle text-sm text-slate-600"
                    >
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
