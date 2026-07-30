import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = new URL("../../../../../../../supabase/migrations/0058_create_durable_kpi_execution.sql", import.meta.url)

test("migration cria tabelas, constraints e índices duráveis", async () => {
  const sql = await readFile(migration, "utf8")
  for (const fragment of ["create table public.kpi_executions", "create table public.kpi_execution_attempts",
    "kpi_executions_idempotency_unique", "kpi_execution_attempts_number_unique",
    "kpi_executions_running_idx", "kpi_executions_correlation_idx"]) assert.match(sql, new RegExp(fragment))
})

test("migration aplica RLS e RPCs security invoker sem PUBLIC", async () => {
  const sql = await readFile(migration, "utf8")
  assert.match(sql, /enable row level security/g)
  assert.match(sql, /reserve_kpi_execution/)
  assert.match(sql, /start_kpi_execution_attempt/)
  assert.match(sql, /security invoker/gi)
  assert.doesNotMatch(sql, /security definer/i)
  assert.doesNotMatch(sql, /\bto\s+public\b/i)
  assert.match(sql, /revoke all on function[\s\S]+from public/i)
})
