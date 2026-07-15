import type {
  EmployeeImportMappingResult,
  EmployeeImportField,
} from "../types/employee-import-mapping"
import type {
  EmployeeImportPreview,
} from "../types/employee-import-preview"
import type {
  EmployeeImportRowIssue,
  EmployeeImportValidatedRow,
  EmployeeImportValidationResult,
} from "../types/employee-import-validation"

const VALID_STATUSES = [
  "active",
  "inactive",
  "on_leave",
  "terminated",
]

const VALID_DISC_PROFILES = [
  "D",
  "I",
  "S",
  "C",
  "ID",
  "IS",
  "IC",
  "DI",
  "DS",
  "DC",
  "SI",
  "SD",
  "SC",
  "CI",
  "CD",
  "CS",
]

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isRecognizedDate(value: string) {
  if (!value) {
    return true
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return !Number.isNaN(Date.parse(`${value}T00:00:00`))
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value
      .split("/")
      .map(Number)

    const date = new Date(year, month - 1, day)

    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    )
  }

  return false
}

function createValues(
  rowValues: string[],
  mapping: EmployeeImportMappingResult
) {
  const values: Partial<Record<EmployeeImportField, string>> = {}

  for (const item of mapping.mappings) {
    if (!item.field) {
      continue
    }

    values[item.field] =
      rowValues[item.columnIndex]?.trim() ?? ""
  }

  return values
}

function validateValues(
  values: Partial<Record<EmployeeImportField, string>>
) {
  const issues: EmployeeImportRowIssue[] = []

  const fullName = values.fullName?.trim() ?? ""
  const email = values.email?.trim() ?? ""
  const birthDate = values.birthDate?.trim() ?? ""
  const hireDate = values.hireDate?.trim() ?? ""
  const status = values.status?.trim().toLowerCase() ?? ""
  const discProfile =
    values.discProfile?.trim().toUpperCase() ?? ""

  if (fullName.length < 2) {
    issues.push({
      field: "fullName",
      fieldLabel: "Nome completo",
      severity: "error",
      message: "Informe o nome do colaborador.",
    })
  }

  if (email && !isValidEmail(email)) {
    issues.push({
      field: "email",
      fieldLabel: "E-mail",
      severity: "error",
      message: "O e-mail informado não é válido.",
    })
  }

  if (birthDate && !isRecognizedDate(birthDate)) {
    issues.push({
      field: "birthDate",
      fieldLabel: "Data de nascimento",
      severity: "warning",
      message:
        "Use o formato AAAA-MM-DD ou DD/MM/AAAA.",
    })
  }

  if (hireDate && !isRecognizedDate(hireDate)) {
    issues.push({
      field: "hireDate",
      fieldLabel: "Data de admissão",
      severity: "warning",
      message:
        "Use o formato AAAA-MM-DD ou DD/MM/AAAA.",
    })
  }

  if (status && !VALID_STATUSES.includes(status)) {
    issues.push({
      field: "status",
      fieldLabel: "Status",
      severity: "warning",
      message:
        "Status não reconhecido. O padrão será ativo.",
    })
  }

  if (
    discProfile &&
    !VALID_DISC_PROFILES.includes(discProfile)
  ) {
    issues.push({
      field: "discProfile",
      fieldLabel: "Perfil DISC",
      severity: "warning",
      message:
        "Perfil DISC não reconhecido e será ignorado.",
    })
  }

  return issues
}

function getRowStatus(
  issues: EmployeeImportRowIssue[]
) {
  if (issues.some((issue) => issue.severity === "error")) {
    return "invalid" as const
  }

  if (issues.length > 0) {
    return "warning" as const
  }

  return "valid" as const
}

export function validateEmployeeImportRows(
  preview: EmployeeImportPreview,
  mapping: EmployeeImportMappingResult
): EmployeeImportValidationResult {
  const rows: EmployeeImportValidatedRow[] =
    preview.rows.map((row) => {
      const values = createValues(row.values, mapping)
      const issues = validateValues(values)

      return {
        rowNumber: row.rowNumber,
        status: getRowStatus(issues),
        fullName: values.fullName ?? "",
        email: values.email ?? "",
        department: values.department ?? "",
        position: values.position ?? "",
        issues,
        values,
      }
    })

  const validRows = rows.filter(
    (row) => row.status === "valid"
  ).length

  const warningRows = rows.filter(
    (row) => row.status === "warning"
  ).length

  const invalidRows = rows.filter(
    (row) => row.status === "invalid"
  ).length

  return {
    rows,
    totalRows: rows.length,
    validRows,
    warningRows,
    invalidRows,
    canImport:
      mapping.hasRequiredFullName &&
      validRows + warningRows > 0,
  }
}
