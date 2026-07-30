import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = new URL("../../../../../../../../supabase/migrations/0061_create_kpi_operational_stores.sql", import.meta.url)
test("migration cria somente stores operacionais persistentes com RLS e RPCs invoker", async () => {
  const sql = await readFile(migration, "utf8")
  assert.match(sql, /create table public\.kpi_operational_deduplication/)
  assert.match(sql, /create table public\.kpi_operational_rate_limit/)
  assert.match(sql, /enable row level security/g); assert.match(sql, /with check/g)
  assert.match(sql, /security invoker/g); assert.match(sql, /revoke all on function[\s\S]+from public/i)
  assert.doesNotMatch(sql, /security definer|\bto\s+public\b|create table[^;]*(runtime|queue|scheduler)/i)
})
