"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"

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
    status: z.string().optional(),
    discProfile: z.string().optional(),
  }),
})

const importEmployeesSchema = z
  .array(importEmployeeRowSchema)
  .min(1, "Nenhum colaborador foi enviado para importação.")
  .max(5000, "Importe no máximo 5.000 colaboradores por vez.")

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
  const normalizedValue = value?.trim().toUpperCase() ?? ""

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

function createEmployeeInput(row: EmployeeImportActionRow) {
  return {
    fullName: row.values.fullName?.trim() ?? "",
    email: normalizeEmail(row.values.email),
    phone: row.values.phone?.trim() ?? "",
    birthDate: normalizeDate(row.values.birthDate),
    hireDate: normalizeDate(row.values.hireDate),
    status: normalizeStatus(row.values.status),
    teamId: "",
    positionId: "",
    managerId: "",
    discProfile: normalizeDiscProfile(
      row.values.discProfile
    ),
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
      errors: [],
    }
  }

  const { companyId } = await getCurrentCompanyContext()
  const existingEmployees = await getEmployees(companyId)

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

  const errors: EmployeeImportActionResult["errors"] = []

  for (const row of parsedRows.data) {
    const employeeInput = createEmployeeInput(row)
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

  const failedRows = errors.length - skippedRows
  const totalRows = parsedRows.data.length

  revalidatePath("/app")
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
    errors,
  }
}
