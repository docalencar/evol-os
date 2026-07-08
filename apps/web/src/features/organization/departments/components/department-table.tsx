import { DataTable } from "@/components/shared/data-table"

import { ArchiveDepartmentButton } from "./archive-department-button"
import { DepartmentEditDialog } from "./department-edit-dialog"

type DepartmentTableItem = {
  id: string
  company_id: string
  name: string
  description: string | null
}

type DepartmentTableProps = {
  departments: DepartmentTableItem[]
}

export function DepartmentTable({ departments }: DepartmentTableProps) {
  return (
    <DataTable
      title="Departamentos"
      data={departments}
      rowKey={(department) => department.id}
      emptyMessage="Nenhum departamento cadastrado."
      columns={[
        {
          key: "name",
          header: "Nome",
          render: (department) => (
            <span className="font-medium text-slate-900">
              {department.name}
            </span>
          ),
        },
        {
          key: "description",
          header: "Descrição",
          render: (department) =>
            department.description || "Sem descrição",
        },
        {
          key: "actions",
          header: "Ações",
          render: (department) => (
            <div className="flex items-center gap-2">
              <DepartmentEditDialog
                companyId={department.company_id}
                department={department}
              />

              <ArchiveDepartmentButton
                companyId={department.company_id}
                departmentId={department.id}
              />
            </div>
          ),
        },
      ]}
    />
  )
}
