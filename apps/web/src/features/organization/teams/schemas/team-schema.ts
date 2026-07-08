import { z } from "zod"

export const createTeamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "O nome do time deve ter pelo menos 2 caracteres.")
    .max(100, "O nome do time deve ter no máximo 100 caracteres."),

  description: z
    .string()
    .trim()
    .max(255, "A descrição deve ter no máximo 255 caracteres.")
    .nullable()
    .optional(),

  parentTeamId: z.string().uuid("Time pai inválido.").nullable().optional(),

  leaderId: z.string().uuid("Líder inválido.").nullable().optional(),
})

export type CreateTeamInput = z.infer<typeof createTeamSchema>
