import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const repository = read("../repositories/assessment-feedback-read-repository.ts")
const query = read("./get-assessment-feedback-read-models.ts")
const barrel = read("../index.ts")

test("0119 read layer routes through the server-only repository RPC", () => {
  assert.match(repository, /import "server-only"/)
  assert.match(repository, /get_tenant_person_direct_report_aggregate_v1/)
  // the RPC name is a repository detail; it must not leak into the read model
  assert.doesNotMatch(query, /get_tenant_person_direct_report_aggregate_v1/)
  // no protected-table fallback / browser client / service_role escape
  assert.doesNotMatch(repository + query, /\.from\(|createBrowserClient|service_role/)
})

test("0119 aggregate schema is strict and carries no reidentification key", () => {
  const schemaStart = repository.indexOf("const personDirectReportAggregateRowSchema")
  const schema = repository.slice(
    schemaStart,
    repository.indexOf("export type PersonDirectReportAggregateRow", schemaStart)
  )
  assert.ok(schemaStart > 0, "schema não encontrado")
  assert.match(schema, /\.strict\(\)/)
  for (const column of [
    "cycle_id", "cycle_name", "model_name", "cycle_date",
    "aggregate_score", "is_qualitative", "suppressed",
  ]) assert.match(schema, new RegExp(column))
  for (const forbidden of [
    "respondent_count", "scored_count", "response_id", "evaluator_id",
    "evaluator_name", "raw_score", "min_score", "max_score", "distribution",
  ]) assert.doesNotMatch(schema, new RegExp(forbidden))
})

test("0119 read model checks the administrative role BEFORE calling the RPC", () => {
  const fn = query.slice(
    query.indexOf("getPersonDirectReportAggregateReadModel"),
    query.indexOf("getAssessmentResponsePageReadModel")
  )
  const guardIndex = fn.indexOf("if (!isAdministrativeRole(actor.role)) return { status: \"forbidden\" }")
  const callIndex = fn.indexOf("personDirectReportAggregate(")
  assert.ok(guardIndex > 0, "guard de papel administrativo ausente")
  assert.ok(callIndex > 0, "chamada ao repositório ausente")
  assert.ok(
    guardIndex < callIndex,
    "o papel precisa ser conferido antes da chamada, para não gerar negação e auditoria a cada render"
  )
})

test("0119 read model distinguishes forbidden / unavailable / ok and does not aggregate client-side", () => {
  const fn = query.slice(
    query.indexOf("getPersonDirectReportAggregateReadModel"),
    query.indexOf("getAssessmentResponsePageReadModel")
  )
  assert.match(fn, /status: "forbidden"/)
  assert.match(fn, /status: "unavailable"/)
  assert.match(fn, /status: "ok", rows/)
  // never collapse a denial/failure into an empty aggregate list
  assert.doesNotMatch(query, /catch[\s\S]{0,140}return \{ status: "ok", rows: \[\] \}/)
  // the read model forwards the boundary rows verbatim; no client-side
  // aggregation/derivation of the anonymous score
  assert.doesNotMatch(fn, /\.reduce\(|\.map\(|aggregate_score\s*[+*/-]|avg\(/)
})

test("0119 read model and row type are exported from the feature barrel", () => {
  assert.match(barrel, /getPersonDirectReportAggregateReadModel/)
  assert.match(barrel, /PersonDirectReportAggregateReadModel/)
  assert.match(barrel, /PersonDirectReportAggregateRow/)
})
