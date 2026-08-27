import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const srcRoot = path.resolve(__dirname, "../../..")
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(srcRoot, relativePath), "utf8")

const personPage = read("app/(dashboard)/app/people/[id]/page.tsx")
const readModels = read(
  "features/assessment-feedback-read/queries/get-assessment-feedback-read-models.ts"
)
const repository = read(
  "features/assessment-feedback-read/repositories/assessment-feedback-read-repository.ts"
)
const card = read(
  "features/people/assessments/components/employee-direct-report-feedback-card.tsx"
)

test("the Person page consumes the 0119 read model + presenter and anchors a separate section", () => {
  assert.match(personPage, /getPersonDirectReportAggregateReadModel\(companyId, id\)/)
  assert.match(personPage, /presentPersonDirectReportAggregate\(/)
  assert.match(personPage, /id="feedback-subordinados-anonimo"/)
  assert.match(personPage, /<EmployeeDirectReportFeedbackCard/)
  assert.match(personPage, /Feedback de subordinados — anônimo/)
})

test("the direct-report surface is separate from Últimas avaliações and Self × Manager (coexistence)", () => {
  // As três dimensões coexistem: a nova seção não substitui nem se mistura.
  assert.match(personPage, /<EmployeeRecentAssessmentResultsCard/)
  assert.match(personPage, /id="ultimas-avaliacoes"/)
  assert.match(personPage, /<EmployeeAssessmentsSummaryCard/)
  // âncoras/seções distintas
  assert.notEqual(
    personPage.indexOf("id=\"ultimas-avaliacoes\""),
    personPage.indexOf("id=\"feedback-subordinados-anonimo\"")
  )
})

test("the Person page never calls the aggregate RPC directly — only via the read model", () => {
  assert.doesNotMatch(personPage, /get_tenant_person_direct_report_aggregate_v1/)
  assert.match(repository, /get_tenant_person_direct_report_aggregate_v1/)
  // a page não fala com o Supabase/RPC direto para esta superfície
  assert.doesNotMatch(personPage, /\.rpc\(|createServerDatabase|service_role/)
})

test("the read model checks the administrative role before the RPC (guard-before-RPC)", () => {
  const fn = readModels.slice(
    readModels.indexOf("getPersonDirectReportAggregateReadModel"),
    readModels.indexOf("getAssessmentResponsePageReadModel")
  )
  const guardIndex = fn.indexOf("if (!isAdministrativeRole(actor.role)) return { status: \"forbidden\" }")
  const callIndex = fn.indexOf("personDirectReportAggregate(")
  assert.ok(guardIndex > 0 && callIndex > 0)
  assert.ok(guardIndex < callIndex)
})

test("the section is hidden only for forbidden; unavailable is passed to the card, not collapsed to empty", () => {
  assert.match(personPage, /directReportAggregate\.status === "forbidden" \? null/)
  assert.match(personPage, /isUnavailable=\{directReportAggregate\.status === "unavailable"\}/)
  assert.match(personPage, /directReportAggregate\.status === "ok"\s*\?\s*directReportAggregate\.rows\s*:\s*\[\]/)
})

test("the card renders no individual CTA / link / drill-down and no cardinality", () => {
  assert.doesNotMatch(card, /<Link|href=|Ver resultado|responses\//)
  for (const forbidden of [
    "respondent", "scored_count", "scoredCount", "response_id", "responseId",
    "evaluator", "raw_score", "rawScore",
  ]) {
    assert.doesNotMatch(card, new RegExp(forbidden))
  }
})
