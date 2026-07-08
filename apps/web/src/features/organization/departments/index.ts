export * from "./types/department";
export { createDepartmentRepository } from "./repositories/department-repository";
export { getDepartments } from "./queries/get-departments";
export { getDepartmentById } from "./queries/get-department-by-id";
export { createDepartmentSchema } from "./schemas/department-schema";
export type { CreateDepartmentInput } from "./schemas/department-schema";

export { createDepartmentAction } from "./actions/create-department-action";
export { DepartmentTable } from "./components/department-table";
export { DepartmentForm } from "./components/department-form"
export { DepartmentCreateDialog } from "./components/department-create-dialog"
export { updateDepartmentAction } from "./actions/update-department-action"
export { DepartmentEditDialog } from "./components/department-edit-dialog"
export { archiveDepartmentAction } from "./actions/archive-department-action"
export { ArchiveDepartmentButton } from "./components/archive-department-button"
