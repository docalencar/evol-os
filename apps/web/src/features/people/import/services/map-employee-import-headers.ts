import type {
  EmployeeImportField,
  EmployeeImportHeaderMapping,
  EmployeeImportMappingResult,
} from "../types/employee-import-mapping"

const FIELD_LABELS: Record<EmployeeImportField, string> = {
  fullName: "Nome completo",
  email: "E-mail",
  phone: "Telefone",
  birthDate: "Data de nascimento",
  hireDate: "Data de admissão",
  department: "Departamento",
  position: "Cargo",
  manager: "Gestor",
  status: "Status",
  discProfile: "Perfil DISC",
}

const HEADER_ALIASES: Record<EmployeeImportField, string[]> = {
  fullName: [
    "nome",
    "nome completo",
    "nome do colaborador",
    "nome funcionario",
    "nome do funcionario",
    "colaborador",
    "funcionario",
    "employee",
    "employee name",
    "full name",
  ],
  email: [
    "email",
    "e mail",
    "correio eletronico",
    "email corporativo",
    "e mail corporativo",
    "work email",
  ],
  phone: [
    "telefone",
    "celular",
    "telefone celular",
    "numero de telefone",
    "phone",
    "mobile",
  ],
  birthDate: [
    "data de nascimento",
    "nascimento",
    "data nascimento",
    "birth date",
    "birthday",
  ],
  hireDate: [
    "data de admissao",
    "admissao",
    "data admissao",
    "data de contratacao",
    "contratacao",
    "hire date",
    "start date",
  ],
  department: [
    "departamento",
    "setor",
    "area",
    "unidade",
    "department",
  ],
  position: [
    "cargo",
    "funcao",
    "posição",
    "position",
    "job title",
    "role",
  ],
  manager: [
    "gestor",
    "lider",
    "supervisor",
    "gerente",
    "responsavel",
    "manager",
    "leader",
  ],
  status: [
    "status",
    "situacao",
    "situacao do colaborador",
    "employee status",
  ],
  discProfile: [
    "disc",
    "perfil disc",
    "perfil comportamental",
    "disc profile",
  ],
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function findMatchingField(
  normalizedHeader: string
): EmployeeImportField | null {
  const entries = Object.entries(
    HEADER_ALIASES
  ) as Array<[EmployeeImportField, string[]]>

  for (const [field, aliases] of entries) {
    const normalizedAliases = aliases.map(normalizeHeader)

    if (normalizedAliases.includes(normalizedHeader)) {
      return field
    }
  }

  return null
}

export function mapEmployeeImportHeaders(
  headers: string[]
): EmployeeImportMappingResult {
  const usedFields = new Set<EmployeeImportField>()

  const mappings: EmployeeImportHeaderMapping[] = headers.map(
    (sourceHeader, columnIndex) => {
      const normalizedHeader = normalizeHeader(sourceHeader)
      const detectedField = findMatchingField(normalizedHeader)

      const field =
        detectedField && !usedFields.has(detectedField)
          ? detectedField
          : null

      if (field) {
        usedFields.add(field)
      }

      return {
        columnIndex,
        sourceHeader,
        normalizedHeader,
        field,
        fieldLabel: field ? FIELD_LABELS[field] : null,
        status: field ? "mapped" : "unmapped",
        required: field === "fullName",
      }
    }
  )

  const mappedCount = mappings.filter(
    (mapping) => mapping.status === "mapped"
  ).length

  const unmappedCount = mappings.length - mappedCount

  const hasRequiredFullName = mappings.some(
    (mapping) => mapping.field === "fullName"
  )

  return {
    mappings,
    mappedCount,
    unmappedCount,
    hasRequiredFullName,
    isReadyForPreview: hasRequiredFullName,
  }
}
