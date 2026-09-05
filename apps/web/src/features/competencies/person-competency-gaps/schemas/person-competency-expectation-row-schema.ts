import { z } from "zod"

const uuid = z.string().uuid()
const nullableUuid = uuid.nullable()
const nullableText = z.string().nullable()

export const personCompetencyExpectationRowSchema = z
  .object({
    assignment_state: z.string(),
    person_id: uuid,
    position_id: nullableUuid,
    position_seniority_profile_id: nullableUuid,
    seniority_level_id: nullableUuid,
    competency_id: nullableUuid,
    competency_name: nullableText,
    expected_level: z.number().int().nullable(),
    weight: z.number().int().nullable(),
    required: z.boolean().nullable(),
    competency_type: nullableText,
    expectation_notes: nullableText,
    expectation_source: nullableText,
    inherited: z.boolean().nullable(),
    employee_competency_id: nullableUuid,
    current_level: z.number().int().nullable(),
    evidence_source: nullableText,
    validated_at: z.string().datetime({ offset: true }).nullable(),
  })
  .strict()

export const personCompetencyExpectationRowsSchema = z.array(
  personCompetencyExpectationRowSchema,
)
