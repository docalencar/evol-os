import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { registerHooks } from "node:module"
import test from "node:test"

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return {
        shortCircuit: true,
        url: "server-only:test",
      }
    }

    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url === "server-only:test") {
      return {
        format: "module",
        shortCircuit: true,
        source: "export {}",
      }
    }

    return nextLoad(url, context)
  },
})

const loadInvitationToken = () => import("./invitation-token")

test("generates a canonical 256-bit base64url token", async () => {
  const { generateInvitationToken } = await loadInvitationToken()
  const token = generateInvitationToken()

  assert.match(token.rawToken, /^[A-Za-z0-9_-]{43}$/)
  assert.doesNotMatch(token.rawToken, /[=+/]/)
  assert.equal(Buffer.from(token.rawToken, "base64url").byteLength, 32)
  assert.deepEqual(Object.keys(token).sort(), ["digestHex", "rawToken"])
})

test("generates distinct tokens across a pragmatic sample", async () => {
  const { generateInvitationToken } = await loadInvitationToken()
  const tokens = Array.from(
    { length: 32 },
    () => generateInvitationToken().rawToken,
  )

  assert.equal(new Set(tokens).size, tokens.length)
})

test("hashes the canonical string with a fixed SHA-256 vector", async () => {
  const { digestInvitationToken } = await loadInvitationToken()
  const digest = digestInvitationToken("canonical-base64url-token")

  assert.equal(
    digest,
    "f4c11c5774508ef1b2daacf94d8ea7d9899cd8658baf865a5470c4e6f1b9e7be",
  )
  assert.match(digest, /^[0-9a-f]{64}$/)
})

test("keeps generation and Phase 6 digest calculation identical", async () => {
  const {
    digestInvitationToken,
    generateInvitationToken,
  } = await loadInvitationToken()
  const token = generateInvitationToken()

  assert.equal(token.digestHex, digestInvitationToken(token.rawToken))
  assert.notEqual(token.rawToken, token.digestHex)
})

test("keeps the implementation server-only and free from secret logging", async () => {
  const source = await readFile(
    new URL("./invitation-token.ts", import.meta.url),
    "utf8",
  )

  assert.match(source, /^import "server-only"/)
  assert.doesNotMatch(source, /console\.(?:log|error|warn|info)/)
})
