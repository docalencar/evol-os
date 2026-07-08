import { z } from "zod"

export const employeeStatusSchema = z.enum([
  "active",
  "inactive",
  "on_leave",
  "terminated",
])

export const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome do colaborador."),
  email: z.string().trim().email("Informe um e-mail válido.").optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  hireDate: z.string().optional().or(z.literal("")),
  status: employeeStatusSchema.default("active"),
  teamId: z.string().uuid().optional().or(z.literal("")),
  positionId: z.string().uuid().optional().or(z.literal("")),
  managerId: z.string().uuid().optional().or(z.literal("")),
})

export const updateEmployeeSchema = createEmployeeSchema.partial()

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>
