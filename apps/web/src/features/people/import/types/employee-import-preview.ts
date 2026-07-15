export type EmployeeImportCsvDelimiter =
  | ","
  | ";"
  | "\t"

export type EmployeeImportFileFormat =
  | "csv"
  | "xlsx"

export type EmployeeImportPreviewRow = {
  rowNumber: number
  values: string[]
}

export type EmployeeImportPreview = {
  fileName: string
  format: EmployeeImportFileFormat
  delimiter: EmployeeImportCsvDelimiter | null
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
