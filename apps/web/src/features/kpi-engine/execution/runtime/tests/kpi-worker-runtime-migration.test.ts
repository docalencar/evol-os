import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = new URL("../../../../../../../../supabase/migrations/0060_allow_worker_lease_reservation.sql", import.meta.url)
test("worker migration permite reservar pending, failed e running com RLS preservada", async () => {
  const sql = await readFile(migration, "utf8")
  assert.match(sql, /status in \('pending', 'failed', 'running'\)/)
  assert.match(sql, /security invoker/i)
  assert.match(sql, /revoke all on function[\s\S]+from public/i)
  assert.doesNotMatch(sql, /security definer|\bto\s+public\b/i)
})
