import assert from "node:assert/strict"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"

const repo = resolve(import.meta.dirname, "../..")
const runnerPath = join(repo, "scripts/local/verify-f-db1d-feedback-tenant-fks.sh")

async function sabotageResetLog(contents, exitCode, label = "rollback") {
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
      F_DB1D_RESET_CLASSIFY_SELFTEST_LABEL: label,
    },
  })
}

for (const label of ["PRE", "drift", "rollback", "POST"]) {
  test(`container unhealthy in ${label} is fail-closed and classified environmental`, async () => {
    const result = await sabotageResetLog(
      "supabase_storage_evol-os container is not ready: unhealthy\nTry rerunning with --debug\n",
      17,
      label,
    )

    assert.equal(result.status, 1)
    assert.match(result.stdout, /^FAILURE_CLASS=ENVIRONMENTAL$/m)
    assert.match(result.stdout, /^RESET_SERVICE=supabase_storage_evol-os$/m)
    assert.match(result.stdout, /^RESET_EXIT_CODE=17$/m)
    assert.match(result.stdout, /^RESET_LOG=.*rollback-reset\.log$/m)
    assert.match(result.stdout, new RegExp(`^STOP: ${label} reset failed$`, "m"))
    assert.doesNotMatch(result.stdout, /CONTINUED_AFTER_RESET_FAILURE/)
  })
}

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

test("all production resets use one status-preserving function with no retry path", async () => {
  const runner = await readFile(runnerPath, "utf8")
  const implementation = /run_reset\(\)\{[\s\S]*?supabase db reset --workdir "\$reset_workdir">"\$reset_log" 2>&1[\s\S]*?reset_rc=\$\?[\s\S]*?classify_reset_failure "\$reset_log" "\$reset_rc" "\$reset_label"[\s\S]*?\n\}/.exec(runner)
  const expectedCalls = [
    'run_reset "$PRE" "$WORK/pre-reset.log" PRE',
    'run_reset "$PRE" "$WORK/drift-reset.log" drift',
    'run_reset "$PRE" "$WORK/rollback-reset.log" rollback',
    'run_reset "$POST" "$WORK/post-reset.log" POST',
  ]

  assert.ok(implementation, "the shared reset function must capture and classify the real subprocess exit code")
  assert.equal((runner.match(/supabase db reset/g) ?? []).length, 1)
  for (const call of expectedCalls) assert.equal(runner.includes(call), true, `${call} must use the shared function`)
  assert.doesNotMatch(runner, /retry|rerun|for .*supabase db reset|while .*supabase db reset/i)
})
