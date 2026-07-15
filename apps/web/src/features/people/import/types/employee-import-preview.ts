export type EmployeeImportCsvDelimiter =
  | ","
  | ";"
  | "\t"

export type EmployeeImportPreviewRow = {
  rowNumber: number
  values: string[]
}

export type EmployeeImportPreview = {
  fileName: string
  delimiter: EmployeeImportCsvDelimiter
  headers: string[]
  rows: EmployeeImportPreviewRow[]
  totalRows: number
  previewLimit: number
}

export type EmployeeImportParseResult =
  | {
      success: true
      preview: EmployeeImportPreview
    }
  | {
      success: false
      message: string
    }
