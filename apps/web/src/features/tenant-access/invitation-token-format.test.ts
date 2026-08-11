import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only" ? { shortCircuit: true, url: "server-only:test" } : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test" ? { format: "module", shortCircuit: true, source: "export {}" } : nextLoad(url, context)
  },
})

async function loadHelper() {
  return import("./invitation-token-format")
}

test("accepts canonical 43-char base64url tokens", async () => {
  const { isRawInvitationTokenFormatValid } = await loadHelper()
  assert.equal(isRawInvitationTokenFormatValid("A".repeat(43)), true)
  assert.equal(isRawInvitationTokenFormatValid("abcdefghijklmnopqrstuvwxyz012345_ABCDEFGHI-"), true)
})

test("rejects wrong length and non-url-safe base64 characters", async () => {
  const { isRawInvitationTokenFormatValid } = await loadHelper()
  for (const bad of [
    "",
    "A".repeat(42),
    "A".repeat(44),
    `${"A".repeat(42)}=`,
    `${"A".repeat(42)}+`,
    `${"A".repeat(42)}/`,
  ]) {
    assert.equal(isRawInvitationTokenFormatValid(bad), false)
  }
})
