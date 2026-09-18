import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const runner = readFileSync(resolve(here, "promote-d-r1-development.sh"), "utf8")
const pre = readFileSync(resolve(here, "verify-d-r1-development-pre.sh"), "utf8")
const post = readFileSync(resolve(here, "verify-d-r1-development-post.sh"), "utf8")

test("runner is pinned to Review, source commit and exact payload hashes", () => {
  assert.match(runner, /REVIEW_REF="rwfvxvbzaosgcyfxdjpt"/)
  assert.match(runner, /SOURCE_COMMIT="e7e22ee659f14010404e939b9e9f303105e9bf16"/)
  for (const hash of [
    "84db30b865b5f3764381f4c63726b35795c18223585773554beb1a480cb311ba",
    "216b9aaab76d75ff495f7d4eb4475197cfa918cb140813fa1c58dfc252d8f07c",
    "29f39e831c32d9d679681f718461d697ed42ae6964fdd5e83c67fcd347a7f073",
  ]) assert.match(runner, new RegExp(hash))
})

test("pre and post verifiers are forced read-only", () => {
  assert.match(pre, /set default_transaction_read_only = on/)
  assert.match(post, /set default_transaction_read_only = on/)
  for (const source of [pre, post]) {
    assert.doesNotMatch(source, /supabase db push|\binsert\s+into\b|\bupdate\s+public\.|\bdelete\s+from\b|\bgrant\s|\brevoke\s/i)
  }
})

test("exact pending set, TOCTOU and one mutation path are mandatory", () => {
  assert.match(runner, /EXPECTED_PENDING='0130_[^']+0131_[^']+0132_[^']+'/)
  assert.match(runner, /cmp -s "\$PRE" "\$TOCTOU"/)
  assert.equal((runner.match(/run_mutating_push <\/dev\/null/g) ?? []).length, 1)
  assert.match(runner, /UNKNOWN_REMOTE_OUTCOME_INSPECT_BEFORE_RETRY/)
})

test("tooling must be canonical main before any connection or mutation", () => {
  const canonical = runner.indexOf("tooling is not canonical origin/main")
  const connect = runner.indexOf("select 1")
  const mutate = runner.indexOf("PROMOTION_ATTEMPT=BEGIN")
  assert.ok(canonical > 0 && canonical < connect && connect < mutate)
})

test("security and retention POST contracts are explicit", () => {
  assert.match(post, /INTERNAL_READER_GRANTS 0/)
  assert.match(post, /EXTERNAL_READER_AUTH_GRANTS 3/)
  assert.match(post, /EXTERNAL_READER_OTHER_GRANTS 0/)
  assert.match(post, /CORE_TABLE_CLIENT_PRIVILEGES 0/)
  assert.match(post, /TEMPLATE_TABLE_CLIENT_PRIVILEGES 0/)
  assert.match(post, /RETENTION_FOUR_RELATIONS 4/)
  assert.match(post, /RETAINED_EVIDENCE_TRIGGERS 2/)
})
