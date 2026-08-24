import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const migration = readFileSync(
  new URL(
    "../../../../../supabase/migrations/0114_create_assessment_execution_snapshot_foundation.sql",
    import.meta.url
  ),
  "utf8"
)
const responseReadModels = readFileSync(
  new URL(
    "../assessment-feedback-read/queries/get-assessment-feedback-read-models.ts",
    import.meta.url
  ),
  "utf8"
)
const responseReadRepository = readFileSync(
  new URL(
    "../assessment-feedback-read/repositories/assessment-feedback-read-repository.ts",
    import.meta.url
  ),
  "utf8"
)

function functionBody(name: string): string {
  const start = migration.indexOf(`function public.${name}`)
  assert.notEqual(start, -1)
  const end = migration.indexOf("\n$$;", start)
  assert.notEqual(end, -1)
  return migration.slice(start, end)
}

test("generation owns one immutable Cycle snapshot and reuses it", () => {
  const generation = functionBody(
    "generate_tenant_assessment_cycle_responses_v1"
  )

  assert.match(generation, /assessment_execution_snapshots/)
  assert.match(generation, /ASSESSMENT_EXECUTION_QUESTIONS_REQUIRED/)
  assert.match(generation, /assessment_execution_snapshot_sections/)
  assert.match(generation, /assessment_execution_snapshot_questions/)
  assert.match(generation, /assessment_execution_snapshot_id/)
  assert.match(migration, /unique \(assessment_cycle_id, company_id\)/)
})

test("save and submit use snapshot Questions without live execution authority", () => {
  const save = functionBody("save_tenant_assessment_answer_v1")
  const submit = functionBody("submit_tenant_assessment_response_v1")

  for (const boundary of [save, submit]) {
    assert.match(boundary, /assessment_execution_snapshot_questions/)
    assert.match(boundary, /active_at_capture/)
    assert.doesNotMatch(boundary, /from public\.assessment_questions/)
    assert.doesNotMatch(boundary, /join public\.assessment_sections/)
  }
})

test("Response execution reads snapshot while authoring preview remains live", () => {
  assert.match(
    responseReadRepository,
    /get_tenant_assessment_response_structure_v1/
  )
  assert.match(
    responseReadRepository,
    /get_tenant_assessment_template_structure_v1/
  )
  assert.match(
    responseReadModels,
    /assessmentResponseStructure\([\s\S]*?companyId,[\s\S]*?responseId/
  )
  assert.doesNotMatch(
    responseReadModels,
    /getAssessmentTemplateStructureReadModel\([\s\S]*?response\.assessment_template_id/
  )
})

test("application roles have no snapshot CRUD or service-role execution path", () => {
  assert.match(
    migration,
    /revoke all on table public\.assessment_execution_snapshots,[\s\S]*?from public,anon,authenticated,service_role/
  )
  assert.doesNotMatch(responseReadModels + responseReadRepository, /\.from\(["']assessment_execution_snapshot/)
  assert.doesNotMatch(responseReadModels + responseReadRepository, /service_role/)
})
