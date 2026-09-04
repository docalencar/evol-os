import { z } from "zod"

import { COMPETENCY_TYPES } from "@/features/competencies/constants/competency-scale"

const identifiersSchema = z.object({
  positionId: z.string().uuid("Cargo inválido."),
  profileId: z.string().uuid("Perfil de senioridade inválido."),
  competencyId: z.string().uuid("Competência inválida."),
})

export const setPositionSeniorityCompetencySchema = identifiersSchema.extend({
  expectedLevel: z.number().int().min(1).max(5),
  weight: z.number().int().min(1).max(5),
  required: z.boolean(),
  type: z.enum(COMPETENCY_TYPES),
  notes: z.string().trim().max(500, "As observações devem ter no máximo 500 caracteres.").nullable(),
})

export const clearPositionSeniorityCompetencySchema = identifiersSchema

export type SetPositionSeniorityCompetencyInput = z.infer<
  typeof setPositionSeniorityCompetencySchema
>
