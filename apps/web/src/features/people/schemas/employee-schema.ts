import { z } from "zod"

export const employeeStatusSchema = z.enum([
  "active",
  "inactive",
  "on_leave",
  "terminated",
])

export const employeeDiscProfileSchema = z.enum([
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

export const createEmployeeSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Informe o nome do colaborador."),

  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .optional()
    .or(z.literal("")),

  phone: z.string().trim().optional().or(z.literal("")),

  birthDate: z.string().optional().or(z.literal("")),

  hireDate: z.string().optional().or(z.literal("")),

  status: employeeStatusSchema.default("active"),

  teamId: z.string().uuid().optional().or(z.literal("")),

  positionId: z.string().uuid().optional().or(z.literal("")),

  managerId: z.string().uuid().optional().or(z.literal("")),

  discProfile: employeeDiscProfileSchema
    .optional()
    .or(z.literal("")),
})

export const updateEmployeeSchema = createEmployeeSchema.partial()

// Full-overwrite contract for update_tenant_person_v1 (which rewrites every
// column). Every field key MUST be present so a partial payload is rejected
// instead of silently clearing data; nullable fields may be explicitly empty.
// status is required WITHOUT a default, so an omitted status is never silently
// coerced to "active".
export const overwriteEmployeeSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Informe o nome do colaborador."),
  email: z
    .string()
    .trim()
    .email("Informe um e-mail válido.")
    .or(z.literal("")),
  phone: z.string().trim().or(z.literal("")),
  birthDate: z.string().or(z.literal("")),
  hireDate: z.string().or(z.literal("")),
  status: employeeStatusSchema,
  teamId: z.string().uuid("Time inválido.").or(z.literal("")),
  positionId: z.string().uuid("Cargo inválido.").or(z.literal("")),
  managerId: z.string().uuid("Gestor inválido.").or(z.literal("")),
  discProfile: employeeDiscProfileSchema.or(z.literal("")),
})

export type OverwriteEmployeeInput = z.infer<
  typeof overwriteEmployeeSchema
>

export type CreateEmployeeInput = z.infer<
  typeof createEmployeeSchema
>

export type UpdateEmployeeInput = z.infer<
  typeof updateEmployeeSchema
>
