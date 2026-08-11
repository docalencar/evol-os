import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { resolve } from "node:path"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { shortCircuit: true, url: "server-only:test" }
    if (specifier === "next/headers") return { shortCircuit: true, url: "next-headers:test" }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === "server-only:test") return { format: "module", shortCircuit: true, source: "export {}" }
    if (url === "next-headers:test") {
      return {
        format: "module",
        shortCircuit: true,
        source: "export function cookies(){ throw new Error('cookies() unavailable in unit test') }",
      }
    }
    return nextLoad(url, context)
  },
})

async function loadModule() {
  return import("./invitation-continuation")
}

const VALID = `/invite/${"A".repeat(43)}`

test("allowlist accepts only an exact internal invite path", async () => {
  const { isAllowedContinuationPath } = await loadModule()
  assert.equal(isAllowedContinuationPath(VALID), true)
  assert.equal(isAllowedContinuationPath(`/invite/${"a1_-".padEnd(43, "z")}`), true)
})

test("allowlist rejects malformed tokens, absolute/relative URLs, query and fragments", async () => {
  const { isAllowedContinuationPath } = await loadModule()
  for (const bad of [
    `/invite/${"A".repeat(42)}`,
    `/invite/${"A".repeat(44)}`,
    `https://evil.example/invite/${"A".repeat(43)}`,
    `http://evil.example/invite/${"A".repeat(43)}`,
    `//evil.example/invite/${"A".repeat(43)}`,
    "/\\evil",
    `/invite/${"A".repeat(43)}?x=1`,
    `/invite/${"A".repeat(43)}#frag`,
    "/app",
    "/login",
    "/signup",
    "javascript:alert(1)",
    "data:text/html,x",
    "/invite/",
    `/invite/${"A".repeat(43)}/extra`,
  ]) {
    assert.equal(isAllowedContinuationPath(bad), false, `should reject: ${bad}`)
  }
})

test("path builder returns the invite path for a valid token and null otherwise", async () => {
  const { buildInvitationContinuationPath } = await loadModule()
  assert.equal(buildInvitationContinuationPath("A".repeat(43)), VALID)
  assert.equal(buildInvitationContinuationPath("A".repeat(42)), null)
  assert.equal(buildInvitationContinuationPath(`${"A".repeat(42)}=`), null)
})

test("continuation cookie is HttpOnly, Lax, Secure outside dev, short-lived and namespaced", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/features/auth/invitation-continuation/invitation-continuation.ts"),
    "utf8",
  )
  assert.match(source, /INVITATION_CONTINUATION_COOKIE = "evol_invitation_continuation"/)
  assert.match(source, /httpOnly: true/)
  assert.match(source, /sameSite: "lax"/)
  assert.match(source, /secure: process\.env\.NODE_ENV !== "development"/)
  assert.match(source, /path: "\/"/)
  assert.match(source, /INVITATION_CONTINUATION_TTL_SECONDS = 15 \* 60/)
  assert.match(source, /maxAge: INVITATION_CONTINUATION_TTL_SECONDS/)
  // Carries only the invite path — no authority fields.
  assert.doesNotMatch(source, /companyId|personId|invitationId|intendedRole|userId|tokenDigest/)
})
