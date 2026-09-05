import { z } from "zod"

import { createServerDatabase } from "@/lib/database/server-database"

import type { PersonCompetencyExpectationRow } from "../types/person-competency-gap"

const uuid = z.string().uuid()
const nullableUuid = uuid.nullable()
const nullableText = z.string().nullable()

const personCompetencyExpectationRowSchema = z
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

type PersonCompetencyExpectationRpcRow = z.infer<
  typeof personCompetencyExpectationRowSchema
>

function mapRow(
  row: PersonCompetencyExpectationRpcRow
): PersonCompetencyExpectationRow {
  return {
    assignment_state: row.assignment_state,
    person_id: row.person_id,
    position_id: row.position_id,
    position_seniority_profile_id: row.position_seniority_profile_id,
    seniority_level_id: row.seniority_level_id,
    competency_id: row.competency_id,
    competency_name: row.competency_name,
    expected_level: row.expected_level,
    weight: row.weight,
    required: row.required,
    competency_type: row.competency_type,
    expectation_notes: row.expectation_notes,
    expectation_source: row.expectation_source,
    inherited: row.inherited,
    employee_competency_id: row.employee_competency_id,
    current_level: row.current_level,
    evidence_source: row.evidence_source,
    validated_at: row.validated_at,
  }
}

export async function createPersonCompetencyExpectationRepository() {
  const database = await createServerDatabase()

  return {
    async findByPerson(companyId: string, personId: string) {
      const { data, error } = await database.rpc(
        "get_tenant_person_competency_expectations_v1",
        {
          p_company_id: companyId,
          p_person_id: personId,
        }
      )

      if (error) {
        return { data: null, error }
      }

      const parsed = z.array(personCompetencyExpectationRowSchema).safeParse(data)

      if (!parsed.success) {
        return { data: null, error: parsed.error }
      }

      return { data: parsed.data.map(mapRow), error: null }
    },
  }
}
