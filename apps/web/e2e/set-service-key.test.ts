/**
 * The env-file rewrite must be surgical: replace exactly the target line —
 * including a previously corrupted value — and leave everything else untouched.
 */

import assert from "node:assert/strict"
import test from "node:test"

import { upsertEnvLine } from "./set-service-key"

const NAME = "E2E_SUPABASE_SERVICE_ROLE_KEY"
const VALUE = "sb_secret_" + "A".repeat(24)

test("replaces an existing empty value", () => {
  const before = ["E2E_BASE_URL=https://evol-os-review.vercel.app", `${NAME}=`, "E2E_EMAIL_DOMAIN=x"].join("\n")
  const after = upsertEnvLine(before, NAME, VALUE)
  assert.equal(after.split("\n")[1], `${NAME}=${VALUE}`)
  assert.match(after, /^E2E_BASE_URL=https:\/\/evol-os-review\.vercel\.app$/m)
  assert.match(after, /^E2E_EMAIL_DOMAIN=x$/m)
})

test("replaces a corrupted value, which is the case that caused this command to exist", () => {
  const corrupted = "cd ~/Desktop/evol-docs/evol-os"
  const before = `E2E_BASE_URL=https://x\n${NAME}=${corrupted}\nE2E_EMAIL_DOMAIN=y`
  const after = upsertEnvLine(before, NAME, VALUE)
  assert.equal(after.includes(corrupted), false)
  assert.match(after, new RegExp(`^${NAME}=${VALUE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"))
})

test("appends when the variable is absent, before a trailing blank line", () => {
  const before = "E2E_BASE_URL=https://x\n"
  const after = upsertEnvLine(before, NAME, VALUE)
  assert.match(after, new RegExp(`^${NAME}=`, "m"))
  assert.match(after, /^E2E_BASE_URL=https:\/\/x$/m)
})

test("replaces only the first occurrence and never duplicates the line", () => {
  const before = `${NAME}=old1\nOTHER=1\n${NAME}=old2`
  const after = upsertEnvLine(before, NAME, VALUE)
  const occurrences = after.split("\n").filter((line) => line.startsWith(`${NAME}=`))
  assert.equal(occurrences.length, 2, "pre-existing duplicates are preserved, not multiplied")
  assert.equal(occurrences[0], `${NAME}=${VALUE}`)
})

test("handles an exported form and surrounding spaces", () => {
  const after = upsertEnvLine(`export ${NAME} = something`, NAME, VALUE)
  assert.equal(after, `${NAME}=${VALUE}`)
})

test("does not disturb a similarly named variable", () => {
  const before = `${NAME}_BACKUP=keepme\n${NAME}=`
  const after = upsertEnvLine(before, NAME, VALUE)
  assert.match(after, new RegExp(`^${NAME}_BACKUP=keepme$`, "m"))
  assert.match(after, new RegExp(`^${NAME}=${VALUE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"))
})

test("comments and blank lines survive", () => {
  const before = `# a comment\n\n${NAME}=\n\n# trailing note\n`
  const after = upsertEnvLine(before, NAME, VALUE)
  assert.match(after, /^# a comment$/m)
  assert.match(after, /^# trailing note$/m)
})
