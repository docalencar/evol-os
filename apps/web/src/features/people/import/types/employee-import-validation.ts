import type {
  EmployeeImportField,
} from "./employee-import-mapping"

export type EmployeeImportRowStatus =
  | "valid"
  | "warning"
  | "invalid"

export type EmployeeImportIssueSeverity =
  | "warning"
  | "error"

export type EmployeeImportRowIssue = {
  field: EmployeeImportField | null
  fieldLabel: string
  severity: EmployeeImportIssueSeverity
  message: string
}

export type EmployeeImportValidatedRow = {
  rowNumber: number
  status: EmployeeImportRowStatus
  fullName: string
  email: string
  department: string
  position: string
  issues: EmployeeImportRowIssue[]
  values: Partial<Record<EmployeeImportField, string>>
}

export type EmployeeImportValidationResult = {
  rows: EmployeeImportValidatedRow[]
  totalRows: number
  validRows: number
  warningRows: number
  invalidRows: number
  canImport: boolean
}
