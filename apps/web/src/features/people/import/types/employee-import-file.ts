export const EMPLOYEE_IMPORT_ACCEPTED_EXTENSIONS = [
  "csv",
  "xlsx",
] as const

export type EmployeeImportAcceptedExtension =
  (typeof EMPLOYEE_IMPORT_ACCEPTED_EXTENSIONS)[number]

export type EmployeeImportSelectedFile = {
  file: File
  name: string
  extension: EmployeeImportAcceptedExtension
  sizeInBytes: number
  formattedSize: string
}

export type EmployeeImportFileValidationResult =
  | {
      success: true
      selectedFile: EmployeeImportSelectedFile
    }
  | {
      success: false
      message: string
    }
