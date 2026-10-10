import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"

const repo = resolve(import.meta.dirname, "../..")
const runnerPath = join(repo, "scripts/local/verify-f-db1d-feedback-tenant-fks.sh")

async function sabotageResetLog(contents, exitCode) {
  const work = await mkdtemp(join(tmpdir(), "f-db1d-reset-observability-"))
  const log = join(work, "rollback-reset.log")
  await writeFile(log, contents, { mode: 0o600 })
  return spawnSync("bash", [runnerPath], {
    cwd: repo,
    encoding: "utf8",
    env: {
      ...process.env,
      F_DB1D_RESET_CLASSIFY_SELFTEST_LOG: log,
      F_DB1D_RESET_CLASSIFY_SELFTEST_RC: String(exitCode),
    },
  })
}

test("container unhealthy is fail-closed and classified environmental", async () => {
  const result = await sabotageResetLog(
    "supabase_storage_evol-os container is not ready: unhealthy\nTry rerunning with --debug\n",
    17,
  )

  assert.equal(result.status, 1)
  assert.match(result.stdout, /^FAILURE_CLASS=ENVIRONMENTAL$/m)
  assert.match(result.stdout, /^RESET_SERVICE=supabase_storage_evol-os$/m)
  assert.match(result.stdout, /^RESET_EXIT_CODE=17$/m)
  assert.match(result.stdout, /^RESET_LOG=.*rollback-reset\.log$/m)
  assert.match(result.stdout, /^STOP: rollback reset failed$/m)
})

test("non-environmental reset error remains a generic fail", async () => {
  const result = await sabotageResetLog("migration failed with SQLSTATE 23503\n", 23)

  assert.equal(result.status, 1)
  assert.match(result.stdout, /^FAILURE_CLASS=FAIL$/m)
  assert.match(result.stdout, /^RESET_EXIT_CODE=23$/m)
  assert.match(result.stdout, /^RESET_LOG=.*rollback-reset\.log$/m)
  assert.doesNotMatch(result.stdout, /^RESET_SERVICE=/m)
  assert.doesNotMatch(result.stdout, /ENVIRONMENTAL/)
  assert.match(result.stdout, /^STOP: rollback reset failed$/m)
})

test("production reset captures the subprocess status and has no retry path", async () => {
  const runner = await readFile(runnerPath, "utf8")
  const reset = /supabase db reset --workdir "\$PRE">"\$WORK\/rollback-reset\.log" 2>&1\nRESET_RC=\$\?\n\[ "\$RESET_RC" -eq 0 \] \|\| classify_reset_failure/.exec(runner)

  assert.ok(reset, "rollback reset must capture and classify the real subprocess exit code")
  assert.equal((runner.match(/supabase db reset --workdir "\$PRE">"\$WORK\/rollback-reset\.log"/g) ?? []).length, 1)
  assert.doesNotMatch(runner, /retry|rerun|for .*supabase db reset|while .*supabase db reset/i)
})
