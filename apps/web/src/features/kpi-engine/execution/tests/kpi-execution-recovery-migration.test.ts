import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

const migration = new URL("../../../../../../../supabase/migrations/0059_add_kpi_execution_recovery_leases.sql", import.meta.url)

test("migration adiciona leases, constraints e índices", async () => {
  const sql = await readFile(migration, "utf8")
  for (const fragment of ["lease_owner", "lease_id", "lease_acquired_at", "lease_expires_at", "lease_renewed_at",
    "kpi_executions_lease_consistency_check", "kpi_executions_expired_lease_idx",
    "kpi_executions_active_lease_id_idx"]) assert.match(sql, new RegExp(fragment))
})

test("migration cria quatro RPCs invoker e revoga PUBLIC", async () => {
  const sql = await readFile(migration, "utf8")
  for (const rpc of ["acquire_execution_lease", "renew_execution_lease",
    "release_execution_lease", "recover_execution"]) {
    assert.match(sql, new RegExp(`function public\\.${rpc}`))
  }
  assert.match(sql, /security invoker/gi)
  assert.doesNotMatch(sql, /security definer/i)
  assert.doesNotMatch(sql, /\bto\s+public\b/i)
  assert.match(sql, /revoke all on function[\s\S]+from public/i)
  assert.match(sql, /is_company_member\(company_id\)/)
  assert.match(sql, /with check \(public\.has_company_role/)
})
