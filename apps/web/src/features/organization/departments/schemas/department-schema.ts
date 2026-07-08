import { z } from "zod";

export const createDepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome do departamento deve ter pelo menos 2 caracteres.")
    .max(100, "O nome do departamento deve ter no máximo 100 caracteres."),

  description: z
    .string()
    .trim()
    .max(255, "A descrição deve ter no máximo 255 caracteres.")
    .nullable()
    .optional(),

  leaderId: z
    .string()
    .uuid("Líder inválido.")
    .nullable()
    .optional(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;