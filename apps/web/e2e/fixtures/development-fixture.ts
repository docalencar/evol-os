/**
 * Development journey fixture — the competency facts the template resolver needs.
 *
 * `complete_development_template_application_v1` does not merely copy a template.
 * It re-verifies, at application time, that the competency still exists with the
 * name and expected level the resolution recorded, and that the subject's current
 * level matches what was resolved and is not above the applied target. Without
 * those rows the application fails closed with
 * `DEVELOPMENT_TEMPLATE_COMPETENCY_CHANGED` — so this is fixture, not journey.
 *
 * Deliberately separate from `tenant-fixture.ts`: global setup runs for every
 * spec, and Development data has no business being provisioned for runs that
 * never reach the Development journey. The spec asks for it when it needs it.
 *
 * Everything is run-scoped and written through the service-role client, exactly
 * as the tenant fixture does. Nothing here is a journey action: the journey is
 * what the browser does afterwards.
 */

import { adminClient } from "../helpers/admin-client"

/** Catalog expectation. The subject sits below it so the plan has somewhere to go. */
export const DEVELOPMENT_EXPECTED_LEVEL = 4
export const DEVELOPMENT_CURRENT_LEVEL = 2

export function developmentCompetencyName(runId: string): string {
  return `E2E Dev Competency ${runId}`
}

export function developmentTemplateName(runId: string): string {
  return `E2E Dev Template ${runId}`
}

export type DevelopmentFixture = Readonly<{
  competencyId: string
  competencyName: string
  subjectPersonId: string
}>

/**
 * Ensures the tenant has one competency and that the subject has a current level
 * below the expectation. Idempotent per run: a re-run of the spec finds the same
 * rows rather than multiplying them, which keeps the resolver's uniqueness checks
 * meaningful.
 */
export async function createDevelopmentFixture(input: {
  companyId: string
  subjectPersonId: string
  runId: string
}): Promise<DevelopmentFixture> {
  const { companyId, subjectPersonId, runId } = input
  const client = adminClient()
  const name = developmentCompetencyName(runId)

  const existing = await client
    .from("competencies")
    .select("id")
    .eq("company_id", companyId)
    .eq("name", name)
    .maybeSingle()
  if (existing.error) {
    throw new Error(`E2E_DEV_FIXTURE_COMPETENCY_LOOKUP_FAILED: ${existing.error.message}`)
  }

  let competencyId = existing.data?.id as string | undefined
  if (!competencyId) {
    const created = await client
      .from("competencies")
      .insert({
        company_id: companyId,
        name,
        category: "technical",
        expected_level: DEVELOPMENT_EXPECTED_LEVEL,
        active: true,
      })
      .select("id")
      .single()
    if (created.error || !created.data) {
      throw new Error(`E2E_DEV_FIXTURE_COMPETENCY_FAILED: ${created.error?.message ?? "no row"}`)
    }
    competencyId = created.data.id as string
  }

  // The subject's assessed level. `archived_at is null` is what the resolver
  // reads, so an archived row would silently resolve to level 0 and change the
  // gap the journey is meant to prove.
  const currentLevel = await client
    .from("employee_competencies")
    .select("id")
    .eq("company_id", companyId)
    .eq("employee_id", subjectPersonId)
    .eq("competency_id", competencyId)
    .is("archived_at", null)
    .maybeSingle()
  if (currentLevel.error) {
    throw new Error(`E2E_DEV_FIXTURE_LEVEL_LOOKUP_FAILED: ${currentLevel.error.message}`)
  }

  if (currentLevel.data?.id) {
    const updated = await client
      .from("employee_competencies")
      .update({ current_level: DEVELOPMENT_CURRENT_LEVEL })
      .eq("id", currentLevel.data.id)
    if (updated.error) {
      throw new Error(`E2E_DEV_FIXTURE_LEVEL_UPDATE_FAILED: ${updated.error.message}`)
    }
  } else {
    const inserted = await client.from("employee_competencies").insert({
      company_id: companyId,
      employee_id: subjectPersonId,
      competency_id: competencyId,
      current_level: DEVELOPMENT_CURRENT_LEVEL,
    })
    if (inserted.error) {
      throw new Error(`E2E_DEV_FIXTURE_LEVEL_FAILED: ${inserted.error.message}`)
    }
  }

  return Object.freeze({ competencyId, competencyName: name, subjectPersonId })
}
