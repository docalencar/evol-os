import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const raw = readFileSync(
  new URL("./specs/13-assessment-isolation-authorization.spec.ts", import.meta.url),
  "utf8"
)
const source = raw
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .filter((line) => !line.trim().startsWith("//"))
  .join("\n")

function bodyOf(title: string): string {
  const start = source.indexOf(`test("${title}`)
  assert.notEqual(start, -1, `missing property test ${title}`)
  const next = source.indexOf('\n  test("', start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

test("all three assessment resource classes have direct foreign/nonexistent proofs", () => {
  for (const [title, kind] of [
    ["54. ", "templates"],
    ["55. ", "cycles"],
    ["56. ", "responses"],
  ] as const) {
    const body = bodyOf(title)
    assert.match(body, new RegExp(`probeDirectResourceDenial\\(page, "${kind}", foreignId\\)`))
    assert.match(body, new RegExp(`probeDirectResourceDenial\\(page, "${kind}", NONEXISTENT_ID\\)`))
    assert.match(body, /expectIndistinguishableDenial\(foreign, nonexistent,/)
  }
})

test("isolation includes tenant B list absence and direct-id denial", () => {
  assert.match(bodyOf("53. "), /enterTenantB\(page\)/)
  assert.match(bodyOf("53. "), /not\.toContainText/)
  for (const title of ["54. ", "55. ", "56. "]) assert.match(bodyOf(title), /switchToTenantB\(page\)/)
})

test("a second actor is reached only after real sign-out", () => {
  const switchStart = source.indexOf("async function switchToActor")
  assert.notEqual(switchStart, -1, "spec 13 must name the actor-switch boundary")
  const switchBody = source.slice(switchStart, source.indexOf("\n}", switchStart))

  const signOutAt = switchBody.indexOf("signOutThroughUi(page)")
  const loginAt = switchBody.indexOf("loginThroughUi(page, identity)")
  const shellAt = switchBody.indexOf("expectAuthenticatedShell(page)")
  assert.ok(signOutAt >= 0, "the existing actor must sign out through the UI")
  assert.ok(loginAt > signOutAt, "the next actor must log in only after sign-out")
  assert.ok(shellAt > loginAt, "the next actor's authenticated shell must be proven")

  for (const title of ["54. ", "55. ", "56. "]) {
    assert.match(bodyOf(title), /discoverRun(?:Resource|Response)Id[\s\S]*switchToTenantB\(page\)/)
  }
  assert.match(bodyOf("57. "), /discoverRunResourceId[\s\S]*switchToActor\(page, actor\("employee"\)\)/)
})

test("property 14 uses the real employee and proves capability denial", () => {
  const body = bodyOf("57. ")
  assert.match(body, /switchToActor\(page, actor\("employee"\)\)/)
  assert.doesNotMatch(body, /enterAs\(page, actor\("admin"\)\)/)
  assert.match(body, /probeDirectResourceDenial\(page, "cycles", cycleId\)/)
  for (const control of ["Adicionar participantes", "Gerar avaliações", "Editar ciclo de avaliação"]) {
    assert.ok(body.includes(control), `property 14 must deny ${control}`)
  }
})

test("property 14 is not reduced to menu-hidden-only evidence", () => {
  const body = bodyOf("57. ")
  assert.match(body, /probeDirectResourceDenial/)
  assert.match(body, /denied\.body/)
  assert.match(body, /denied\.route/)
})

test("the spec drives real sessions and never a privileged data client", () => {
  assert.match(source, /loginThroughUi/)
  assert.doesNotMatch(source, /adminClient|service_role|organization-lookup|\.from\(|\.rpc\(/)
})

test("direct goto is confined to the explicitly named security-probe helper", () => {
  const occurrences = source.match(/page\.goto\(/g) ?? []
  assert.equal(occurrences.length, 1)
  const helper = source.slice(
    source.indexOf("async function probeDirectResourceDenial"),
    source.indexOf("\n}", source.indexOf("async function probeDirectResourceDenial"))
  )
  assert.match(helper, /page\.goto\(/)
})

test("the spec has no sleeps, random ids, or timeout inflation", () => {
  assert.doesNotMatch(source, /waitForTimeout|setTimeout|sleep\(|randomUUID/)
  assert.doesNotMatch(source, /test\.setTimeout|timeout:\s*(?:[4-9]\d|\d{3,})_000/)
  assert.match(source, /NONEXISTENT_ID = "00000000-0000-4000-8000-000000000001"/)
})

test("resource ids come from run-owned UI links rather than hardcoding", () => {
  assert.match(source, /discoverRunResourceId/)
  assert.match(source, /discoverRunResponseId/)
  assert.match(source, /getAttribute\("href"\)/)
  assert.match(source, /assessmentTemplateName\(manifest\(\)\.runId\)/)
  assert.match(source, /assessmentResultCycleName\(manifest\(\)\.runId\)/)
})
