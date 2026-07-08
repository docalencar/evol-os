import { ReactNode } from "react"

import { Card } from "@/components/ui/card"

type DataTableColumn<T> = {
  key: string
  header: string
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
      {title ? <h3 className="text-lg font-semibold">{title}</h3> : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3 text-left text-sm font-medium text-slate-700"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
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
              data.map((item, index) => (
                <tr key={rowKey(item)} className="border-t border-slate-200">
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3 text-sm text-slate-600"
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
