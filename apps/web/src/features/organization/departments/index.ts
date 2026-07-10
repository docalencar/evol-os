export type {
  Department,
  DepartmentId,
} from "./types/department"

export { createDepartmentSchema } from "./schemas/department-schema"
export type { CreateDepartmentInput } from "./schemas/department-schema"

export { createDepartmentRepository } from "./repositories/department-repository"

export { getDepartments } from "./queries/get-departments"
export { getDepartmentById } from "./queries/get-department-by-id"

export { createDepartmentAction } from "./actions/create-department-action"
export { updateDepartmentAction } from "./actions/update-department-action"
export { archiveDepartmentAction } from "./actions/archive-department-action"

export { DepartmentForm } from "./components/department-form"
export { DepartmentCreateDialog } from "./components/department-create-dialog"
export { DepartmentEditDialog } from "./components/department-edit-dialog"
export { ArchiveDepartmentButton } from "./components/archive-department-button"
export { DepartmentTable } from "./components/department-table"
