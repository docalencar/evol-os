"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

import {
  createDepartmentRepository,
  getDepartments,
} from "@/features/organization/departments"
import {
  createPositionRepository,
  getPositions,
} from "@/features/organization/positions"
import {
  createEmployeeRepository,
  createEmployeeSchema,
  getEmployees,
} from "@/features/people"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import type {
  EmployeeImportActionResult,
  EmployeeImportActionRow,
} from "../types/employee-import-action"

const importEmployeeRowSchema = z.object({
  rowNumber: z.number().int().positive(),

  values: z.object({
    fullName: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    birthDate: z.string().optional(),
    hireDate: z.string().optional(),
    department: z.string().optional(),
    position: z.string().optional(),
    status: z.string().optional(),
    discProfile: z.string().optional(),
  }),
})

const importEmployeesSchema = z
  .array(importEmployeeRowSchema)
  .min(1, "Nenhum colaborador foi enviado para importação.")
  .max(5000, "Importe no máximo 5.000 colaboradores por vez.")

function normalizeComparableValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function normalizeDate(value: string | undefined) {
  const normalizedValue = value?.trim() ?? ""

  if (!normalizedValue) {
    return ""
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return normalizedValue
  }

  const brazilianDateMatch = normalizedValue.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  )

  if (!brazilianDateMatch) {
    return ""
  }

  const [, day, month, year] = brazilianDateMatch

  return `${year}-${month}-${day}`
}

function normalizeStatus(value: string | undefined) {
  const normalizedValue = value?.trim().toLowerCase()

  switch (normalizedValue) {
    case "active":
    case "ativo":
    case "ativa":
      return "active" as const

    case "inactive":
    case "inativo":
    case "inativa":
      return "inactive" as const

    case "on_leave":
    case "afastado":
    case "afastada":
      return "on_leave" as const

    case "terminated":
    case "desligado":
    case "desligada":
      return "terminated" as const

    default:
      return "active" as const
  }
}

function normalizeDiscProfile(value: string | undefined) {
  const normalizedValue =
    value?.trim().toUpperCase() ?? ""

  const validProfiles = new Set([
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
  ])

  return validProfiles.has(normalizedValue)
    ? normalizedValue
    : ""
}

function normalizeEmail(value: string | undefined) {
  return value?.trim().toLowerCase() ?? ""
}

function createPositionKey(
  positionName: string,
  departmentName: string
) {
  return [
    normalizeComparableValue(positionName),
    normalizeComparableValue(departmentName),
  ].join("::")
}

function createEmployeeInput(
  row: EmployeeImportActionRow,
  positionId: string
) {
  return {
    fullName: row.values.fullName?.trim() ?? "",
    email: normalizeEmail(row.values.email),
    phone: row.values.phone?.trim() ?? "",
    birthDate: normalizeDate(row.values.birthDate),
    hireDate: normalizeDate(row.values.hireDate),
    status: normalizeStatus(row.values.status),
    teamId: "",
    positionId,
    managerId: "",
    discProfile: normalizeDiscProfile(
      row.values.discProfile
    ),
  }
}

async function createMissingDepartments(
  companyId: string,
  rows: EmployeeImportActionRow[]
) {
  const existingDepartments =
    await getDepartments(companyId)

  const knownNames = new Set(
    (existingDepartments ?? []).map((department) =>
      normalizeComparableValue(department.name)
    )
  )

  const requestedDepartments = new Map<string, string>()

  for (const row of rows) {
    const departmentName =
      row.values.department?.trim() ?? ""

    if (!departmentName) {
      continue
    }

    const normalizedName =
      normalizeComparableValue(departmentName)

    if (
      !knownNames.has(normalizedName) &&
      !requestedDepartments.has(normalizedName)
    ) {
      requestedDepartments.set(
        normalizedName,
        departmentName
      )
    }
  }

  const repository =
    await createDepartmentRepository()

  let createdDepartments = 0

  const errors: EmployeeImportActionResult["errors"] = []

  for (const [
    normalizedName,
    departmentName,
  ] of requestedDepartments) {
    const { error } = await repository.create({
      companyId,
      name: departmentName,
      description: null,
      leaderId: null,
    })

    if (error) {
      errors.push({
        rowNumber: 0,
        message:
          `Não foi possível criar o departamento "${departmentName}": ${error.message}`,
      })

      continue
    }

    knownNames.add(normalizedName)
    createdDepartments += 1
  }

  return {
    createdDepartments,
    errors,
  }
}

async function preparePositions(
  companyId: string,
  rows: EmployeeImportActionRow[]
) {
  const departments = await getDepartments(companyId)

  const departmentIdByName = new Map(
    (departments ?? []).map((department) => [
      normalizeComparableValue(department.name),
      department.id,
    ])
  )

  const existingPositions = await getPositions(companyId)

  const knownPositionKeys = new Set(
    existingPositions.map((position) => {
      const departmentName =
        (departments ?? []).find(
          (department) =>
            department.id === position.department_id
        )?.name ?? ""

      return createPositionKey(
        position.name,
        departmentName
      )
    })
  )

  const requestedPositions = new Map<
    string,
    {
      name: string
      departmentName: string
      departmentId: string | null
    }
  >()

  for (const row of rows) {
    const positionName =
      row.values.position?.trim() ?? ""

    if (!positionName) {
      continue
    }

    const departmentName =
      row.values.department?.trim() ?? ""

    const positionKey = createPositionKey(
      positionName,
      departmentName
    )

    if (
      knownPositionKeys.has(positionKey) ||
      requestedPositions.has(positionKey)
    ) {
      continue
    }

    const departmentId = departmentName
      ? departmentIdByName.get(
          normalizeComparableValue(departmentName)
        ) ?? null
      : null

    requestedPositions.set(positionKey, {
      name: positionName,
      departmentName,
      departmentId,
    })
  }

  const repository = await createPositionRepository()

  let createdPositions = 0

  const errors: EmployeeImportActionResult["errors"] = []

  for (const [
    positionKey,
    position,
  ] of requestedPositions) {
    const { error } = await repository.create({
      companyId,
      name: position.name,
      description: null,
      departmentId: position.departmentId,
      hierarchicalLevel: "analyst",
      status: "active",
      weeklyWorkloadHours: 44,
      workModel: "on_site",
      employmentType: "clt",
      travelRequirement: "none",
    })

    if (error) {
      errors.push({
        rowNumber: 0,
        message:
          `Não foi possível criar o cargo "${position.name}": ${error.message}`,
      })

      continue
    }

    knownPositionKeys.add(positionKey)
    createdPositions += 1
  }

  const refreshedPositions = await getPositions(companyId)

  const positionIdByKey = new Map<string, string>()

  for (const position of refreshedPositions) {
    const departmentName =
      (departments ?? []).find(
        (department) =>
          department.id === position.department_id
      )?.name ?? ""

    positionIdByKey.set(
      createPositionKey(
        position.name,
        departmentName
      ),
      position.id
    )
  }

  return {
    createdPositions,
    positionIdByKey,
    errors,
  }
}

export async function importEmployeesAction(
  input: unknown
): Promise<EmployeeImportActionResult> {
  const parsedRows = importEmployeesSchema.safeParse(input)

  if (!parsedRows.success) {
    return {
      success: false,
      message:
        "Os dados da importação são inválidos ou excedem o limite permitido.",
      totalRows: 0,
      importedRows: 0,
      skippedRows: 0,
      failedRows: 0,
      createdDepartments: 0,
      createdPositions: 0,
      errors: [],
    }
  }

  const { companyId } =
    await getCurrentCompanyContext()

  const departmentResult =
    await createMissingDepartments(
      companyId,
      parsedRows.data
    )

  const positionResult = await preparePositions(
    companyId,
    parsedRows.data
  )

  const existingEmployees =
    await getEmployees(companyId)

  const registeredEmails = new Set(
    (existingEmployees ?? [])
      .map((employee) =>
        employee.email?.trim().toLowerCase()
      )
      .filter(
        (email): email is string => Boolean(email)
      )
  )

  const processedEmails = new Set<string>()

  const employeeRepository =
    await createEmployeeRepository()

  let importedRows = 0
  let skippedRows = 0
  let failedRows = 0

  const errors: EmployeeImportActionResult["errors"] = [
    ...departmentResult.errors,
    ...positionResult.errors,
  ]

  for (const row of parsedRows.data) {
    const positionName =
      row.values.position?.trim() ?? ""

    const departmentName =
      row.values.department?.trim() ?? ""

    const positionId = positionName
      ? positionResult.positionIdByKey.get(
          createPositionKey(
            positionName,
            departmentName
          )
        ) ?? ""
      : ""

    if (positionName && !positionId) {
      skippedRows += 1

      errors.push({
        rowNumber: row.rowNumber,
        message:
          `O cargo "${positionName}" não pôde ser localizado após a preparação da estrutura.`,
      })

      continue
    }

    const employeeInput = createEmployeeInput(
      row,
      positionId
    )

    const parsedEmployee =
      createEmployeeSchema.safeParse(employeeInput)

    if (!parsedEmployee.success) {
      skippedRows += 1

      errors.push({
        rowNumber: row.rowNumber,
        message:
          parsedEmployee.error.issues[0]?.message ??
          "Os dados do colaborador são inválidos.",
      })

      continue
    }

    const email = normalizeEmail(
      parsedEmployee.data.email
    )

    if (
      email &&
      (
        registeredEmails.has(email) ||
        processedEmails.has(email)
      )
    ) {
      skippedRows += 1

      errors.push({
        rowNumber: row.rowNumber,
        message:
          "O e-mail já está cadastrado ou aparece mais de uma vez na planilha.",
      })

      continue
    }

    const { error } = await employeeRepository.create(
      companyId,
      parsedEmployee.data
    )

    if (error) {
      failedRows += 1

      errors.push({
        rowNumber: row.rowNumber,
        message: error.message,
      })

      continue
    }

    importedRows += 1

    if (email) {
      processedEmails.add(email)
    }
  }

  const totalRows = parsedRows.data.length

  revalidatePath("/app")
  revalidatePath("/app/company")
  revalidatePath("/app/company/positions")
  revalidatePath("/app/people")
  revalidatePath("/app/people/import")

  return {
    success: importedRows > 0,
    message:
      importedRows > 0
        ? `${importedRows} colaborador${
            importedRows === 1 ? "" : "es"
          } importado${
            importedRows === 1 ? "" : "s"
          } com sucesso.`
        : "Nenhum colaborador pôde ser importado.",
    totalRows,
    importedRows,
    skippedRows,
    failedRows,
    createdDepartments:
      departmentResult.createdDepartments,
    createdPositions:
      positionResult.createdPositions,
    errors,
  }
}
