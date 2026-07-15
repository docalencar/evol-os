export type EmployeeImportField =
  | "fullName"
  | "email"
  | "phone"
  | "birthDate"
  | "hireDate"
  | "department"
  | "position"
  | "manager"
  | "status"
  | "discProfile"

export type EmployeeImportHeaderMappingStatus =
  | "mapped"
  | "unmapped"

export type EmployeeImportHeaderMapping = {
  columnIndex: number
  sourceHeader: string
  normalizedHeader: string
  field: EmployeeImportField | null
  fieldLabel: string | null
  status: EmployeeImportHeaderMappingStatus
  required: boolean
}

export type EmployeeImportMappingResult = {
  mappings: EmployeeImportHeaderMapping[]
  mappedCount: number
  unmappedCount: number
  hasRequiredFullName: boolean
  isReadyForPreview: boolean
}
