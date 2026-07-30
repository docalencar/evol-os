import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const migrationPath = resolve(
  process.cwd(),
  "../../supabase/migrations/0057_create_kpi_persistence_history.sql"
)
const migration = readFileSync(migrationPath, "utf8")

test("migration cria as quatro tabelas de KPI", () => {
  for (const table of [
    "kpi_definitions",
    "kpi_definition_versions",
    "kpi_evaluations",
    "kpi_evaluation_snapshots",
  ]) {
    assert.match(migration, new RegExp(`create table public\\.${table}`))
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`))
  }
})

test("todas as policies são autenticadas, company-scoped e possuem checks de escrita", () => {
  assert.doesNotMatch(migration, /create policy[\s\S]*?\bto public\b/i)
  assert.match(migration, /using \(public\.is_company_member\(company_id\)\)/)
  assert.match(migration, /using \(public\.has_company_role\(company_id/)
  assert.match(migration, /with check \(public\.has_company_role\(company_id/)
})

test("snapshots são imutáveis e avaliação com snapshot é transacional", () => {
  assert.match(migration, /KPI_EVALUATION_SNAPSHOT_IS_IMMUTABLE/)
  assert.match(migration, /create trigger prevent_kpi_snapshot_mutation/)
  assert.match(migration, /create or replace function public\.persist_kpi_evaluation/)
  assert.match(migration, /security invoker/)
})

test("modelagem protege versionamento, história e períodos sobrepostos", () => {
  assert.match(migration, /kpi_definition_versions_period_exclusion/)
  assert.match(migration, /tstzrange\(effective_from, effective_until, '\[\)'\)/)
  assert.match(migration, /kpi_evaluations_company_history_idx/)
  assert.match(migration, /kpi_evaluations_definition_history_idx/)
  assert.match(migration, /kpi_evaluations_scope_history_idx/)
})
