/**
 * F-DB1b — regression suite for the PostgREST embedding probe.
 *
 * WHY THIS EXISTS
 *
 * Step 6/6 of verify-f-db1b-assessment-composite-fks.sh previously printed
 * POSTGREST_NAMES=PASS from two greps over a TypeScript file. It asserted a
 * relational guarantee it had never measured, and nothing could have caught
 * that, because the verdict function was unreachable without a full Supabase
 * stack.
 *
 * So the probe now has a self-test mode, and this suite drives it against real
 * HTTP servers that impersonate PostgREST's failure modes. Each case asserts the
 * probe FAILS CLOSED — a probe that only ever returns PASS is indistinguishable
 * from the grep it replaced.
 *
 * No Supabase, no database, no network beyond loopback. Every server is bound to
 * 127.0.0.1 and torn down with the test.
 */

import assert from "node:assert/strict"
import { createServer } from "node:http"
import { chmodSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { execFile } from "node:child_process"
import { resolve } from "node:path"
import test from "node:test"

const RUNNER = resolve(import.meta.dirname, "verify-f-db1b-assessment-composite-fks.sh")
const PROBE = resolve(import.meta.dirname, "lib/postgrest-embed-probe.sh")

/** Serve one canned reply for every request; returns {url, close}. */
async function stub(handler) {
  const server = createServer(handler)
  await new Promise((done) => server.listen(0, "127.0.0.1", done))
  const { port } = server.address()
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((done) => server.close(done)),
  }
}

/**
 * Drive the SHARED PROBE directly, through its CLI mode. The ten scenarios below
 * test the one implementation; nothing is reimplemented for testing.
 */
function runProbe(url, key = "selftest-key-not-a-real-secret") {
  const specs = [
    "people!assessment_responses_employee_id_fkey",
    "people!assessment_responses_evaluator_id_fkey",
  ]
  const one = (spec) => new Promise((done) => {
    execFile("bash", [PROBE, spec],
      { env: { ...process.env, POSTGREST_PROBE_URL: url, POSTGREST_PROBE_KEY: key }, timeout: 60_000 },
      (error, stdout, stderr) => done({ code: error?.code ?? 0, out: `${stdout}${stderr}`.trim() }))
  })
  return Promise.all(specs.map(one)).then(([employee, evaluator]) => ({
    code: employee.code === 0 && evaluator.code === 0 ? 0 : 1,
    // Rendered in the runner's vocabulary so the scenarios read the same either way.
    out: [
      `POSTGREST_EMBED[employee]=${employee.out}`,
      `POSTGREST_EMBED[evaluator]=${evaluator.out}`,
      employee.out === "PASS" && evaluator.out === "PASS"
        ? "POSTGREST_REAL_TEST=PASS" : "POSTGREST_REAL_TEST=FAIL",
      employee.out === "NON_LOOPBACK_TARGET" ? "POSTGREST_TARGET_PROVEN_LOCAL=NO" : "",
    ].join("\n"),
  }))
}

/** Drive the RUNNER's self-test mode — used only to prove integration. */
function runRunner(url, key = "selftest-key-not-a-real-secret") {
  return new Promise((done) => {
    execFile("bash", [RUNNER],
      { env: { ...process.env, F_DB1B_SELFTEST_URL: url, F_DB1B_SELFTEST_KEY: key }, timeout: 60_000 },
      (error, stdout, stderr) => done({ code: error?.code ?? 0, out: `${stdout}${stderr}` }))
  })
}

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json" })
  res.end(body)
}

test("a valid 200 with a JSON array passes — limit=0 needs no rows", async () => {
  // Exactly what PostgREST returns for ?limit=0 once the relationship resolves.
  const s = await stub((req, res) => {
    assert.match(req.url, /select=id,people!assessment_responses_(employee|evaluator)_id_fkey\(id\)/)
    assert.match(req.url, /limit=0/)
    json(res, 200, "[]")
  })
  try {
    const { code, out } = await runProbe(s.url)
    assert.match(out, /POSTGREST_EMBED\[employee\]=PASS/)
    assert.match(out, /POSTGREST_EMBED\[evaluator\]=PASS/)
    assert.match(out, /POSTGREST_REAL_TEST=PASS/)
    assert.equal(code, 0)
  } finally { await s.close() }
})

test("PGRST201 ambiguous embedding fails closed and is named", async () => {
  // The failure 0144 could plausibly introduce: two FK paths between the same
  // pair of tables, so PostgREST cannot choose. It answers 300, not 4xx.
  const s = await stub((_req, res) => json(res, 300, JSON.stringify({
    code: "PGRST201",
    message: "Could not embed because more than one relationship was found",
  })))
  try {
    const { code, out } = await runProbe(s.url)
    assert.match(out, /POSTGREST_EMBED\[employee\]=PGRST201_AMBIGUOUS/)
    assert.match(out, /POSTGREST_REAL_TEST=FAIL/)
    assert.equal(code, 1)
  } finally { await s.close() }
})

test("any other PostgREST error code fails closed and is surfaced", async () => {
  // PGRST200: relationship not found — what a BROKEN rename would produce.
  const s = await stub((_req, res) => json(res, 400, JSON.stringify({
    code: "PGRST200", message: "Could not find a relationship",
  })))
  try {
    const { code, out } = await runProbe(s.url)
    assert.match(out, /POSTGREST_EMBED\[employee\]=POSTGREST_ERROR_PGRST200/)
    assert.match(out, /POSTGREST_REAL_TEST=FAIL/)
    assert.equal(code, 1)
  } finally { await s.close() }
})

test("a non-200 status without a PostgREST code still fails closed", async () => {
  const s = await stub((_req, res) => json(res, 503, "upstream unavailable"))
  try {
    const { code, out } = await runProbe(s.url)
    assert.match(out, /POSTGREST_EMBED\[employee\]=HTTP_503/)
    assert.equal(code, 1)
  } finally { await s.close() }
})

test("200 with a body that is not a JSON array fails closed", async () => {
  // A proxy or login page answering 200 must never read as success.
  const s = await stub((_req, res) => json(res, 200, "<html>not json</html>"))
  try {
    const { code, out } = await runProbe(s.url)
    assert.match(out, /POSTGREST_EMBED\[employee\]=INVALID_JSON/)
    assert.equal(code, 1)
  } finally { await s.close() }
})

test("200 with valid JSON that is an object, not an array, fails closed", async () => {
  const s = await stub((_req, res) => json(res, 200, '{"id":"x"}'))
  try {
    const { code, out } = await runProbe(s.url)
    assert.match(out, /POSTGREST_EMBED\[employee\]=INVALID_JSON/)
    assert.equal(code, 1)
  } finally { await s.close() }
})

test("an unreachable HTTP endpoint fails closed", async () => {
  // Bind and immediately release a port so nothing is listening on it.
  const s = await stub(() => {})
  const dead = s.url
  await s.close()
  const { code, out } = await runProbe(dead)
  assert.match(out, /POSTGREST_EMBED\[employee\]=CONNECTION_FAILED/)
  assert.match(out, /POSTGREST_REAL_TEST=FAIL/)
  assert.equal(code, 1)
})

test("a non-loopback URL is refused before any request is made", async () => {
  let reached = false
  const s = await stub((_req, res) => { reached = true; json(res, 200, "[]") })
  try {
    // Host is not loopback; the probe must refuse on the host check alone.
    const { code, out } = await runProbe("http://evol-os-review.vercel.app")
    assert.match(out, /POSTGREST_TARGET_PROVEN_LOCAL=NO/)
    assert.equal(code, 1)
    assert.equal(reached, false, "no request may be issued to a non-loopback host")
  } finally { await s.close() }
})

test("the credential never appears in the probe's output", async () => {
  const secret = "eyJsupersecrettoken.doesnotbelonginlogs"
  const s = await stub((_req, res) => json(res, 200, "[]"))
  try {
    const { out } = await runProbe(s.url, secret)
    assert.ok(!out.includes(secret), "the apikey leaked into the runner's output")
    assert.ok(!out.includes("eyJ"), "a JWT-looking token leaked into the runner's output")
  } finally { await s.close() }
})

test("the static check is reported separately and cannot substitute for HTTP", () => {
  const src = readFileSync(RUNNER, "utf8")
  const code = src.split("\n").map((l) => l.replace(/\s*#.*$/, "")).join("\n")
  assert.match(code, /POSTGREST_STATIC_CHECK=PASS/)
  assert.match(code, /verify-f-db1b-isolated-postgrest\.sh/)
  assert.doesNotMatch(code, /POSTGREST_NAMES=/, "the old conflated key is gone")
  assert.match(code, /POSTGREST_REAL_TEST=FAIL/)
})

test("the runner holds NO probe implementation of its own", () => {
  const code = readFileSync(RUNNER, "utf8").split("\n")
    .map((l) => l.replace(/\s*#.*$/, "")).join("\n")
  // One implementation only: the runner must not define a probe, nor speak HTTP.
  assert.doesNotMatch(code, /probe_embed\s*\(\)/, "the runner redefines the probe")
  assert.doesNotMatch(code, /curl -K/, "the runner issues its own HTTP request")
  assert.match(code, /\.\s+"\$ROOT\/\$PROBE_LIB"/, "the runner must source the shared library")
  assert.match(code, /postgrest_embed_probe "\$F_DB1B_SELFTEST_URL" SELFTEST_KEY/,
    "self-test must call the shared probe with the key BY NAME")
  assert.match(code, /bash scripts\/local\/verify-f-db1b-isolated-postgrest\.sh/,
    "the real gate must delegate to the isolated verifier")
})

test("the runner really INVOKES the shared library — sabotage changes its verdict", async () => {
  // Textual reference is not invocation. Sabotage the library so the shared
  // probe can only answer INVALID_JSON, then assert the RUNNER reports that.
  // If the runner carried its own copy, it would still answer PASS.
  const original = readFileSync(PROBE, "utf8")
  const s = await stub((_req, res) => json(res, 200, "[]"))
  try {
    writeFileSync(PROBE, original.replace("printf 'PASS'", "printf 'INVALID_JSON'; return 1"))
    const sabotaged = await runRunner(s.url)
    assert.match(sabotaged.out, /POSTGREST_EMBED\[employee\]=INVALID_JSON/,
      "the runner did not execute the sabotaged shared library")
    assert.equal(sabotaged.code, 1)

    writeFileSync(PROBE, original)
    const restored = await runRunner(s.url)
    assert.match(restored.out, /POSTGREST_REAL_TEST=PASS/, "restoring the library must restore PASS")
    assert.equal(restored.code, 0)
  } finally {
    writeFileSync(PROBE, original)
    await s.close()
  }
})

test("a missing shared library fails the runner closed", async () => {
  const original = readFileSync(PROBE, "utf8")
  const s = await stub((_req, res) => json(res, 200, "[]"))
  try {
    rmSync(PROBE)
    const { code, out } = await runRunner(s.url)
    assert.match(out, /shared probe library unavailable/)
    assert.equal(code, 1)
  } finally {
    writeFileSync(PROBE, original)
    chmodSync(PROBE, 0o755)
    await s.close()
  }
})
