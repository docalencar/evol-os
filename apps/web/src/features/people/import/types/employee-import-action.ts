import type {
  EmployeeImportField,
} from "./employee-import-mapping"

export type EmployeeImportActionRow = {
  rowNumber: number
  values: Partial<Record<EmployeeImportField, string>>
}

export type EmployeeImportActionError = {
  rowNumber: number
  message: string
}

export type EmployeeImportActionResult = {
  success: boolean
  message: string
  totalRows: number
  importedRows: number
  skippedRows: number
  failedRows: number
  errors: EmployeeImportActionError[]
}
