import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { resolve } from "node:path"
import test from "node:test"

import { nextState } from "./lifecycle"
import {
  createDurableTurnoverJournal,
  readDurableTurnoverJournal,
  replaceDurableTurnoverJournal,
} from "./journal-store"

function fixtureJournalPath(): { directory: string; path: string } {
  const directory = mkdtempSync(resolve(tmpdir(), "turnover-durable-journal-"))
  return { directory, path: resolve(directory, "fixture.json") }
}

test("journal creation is exclusive, secret-free and mode 0600", () => {
  const { directory, path } = fixtureJournalPath()
  try {
    createDurableTurnoverJournal(path)
    assert.throws(() => createDurableTurnoverJournal(path), /EEXIST/)
    assert.equal(statSync(path).mode & 0o777, 0o600)
    assert.doesNotMatch(readFileSync(path, "utf8"), /password|secret|key/i)
  } finally {
    rmSync(directory, { recursive: true })
  }
})

test("read fails closed for missing, malformed or foreign journals", () => {
  const { directory, path } = fixtureJournalPath()
  try {
    assert.throws(() => readDurableTurnoverJournal(path), /JOURNAL_MISSING/)
    writeFileSync(path, "not-json", { mode: 0o600 })
    assert.throws(() => readDurableTurnoverJournal(path), /JOURNAL_INVALID/)
    writeFileSync(path, JSON.stringify({ marker: "foreign" }), { mode: 0o600 })
    assert.throws(() => readDurableTurnoverJournal(path))
  } finally {
    rmSync(directory, { recursive: true })
  }
})

test("atomic replacement requires compare-and-swap revision", () => {
  const { directory, path } = fixtureJournalPath()
  try {
    const planned = createDurableTurnoverJournal(path)
    const withCompany = {
      ...planned,
      company: { id: "11111111-1111-4111-8111-111111111111", syntheticName: "E2E Turnover Durable alpha", syntheticSlug: "e2e-turnover-durable-alpha" },
    }
    const bootstrapped = nextState(withCompany, "BOOTSTRAPPED")
    replaceDurableTurnoverJournal(path, 0, bootstrapped)
    assert.equal(readDurableTurnoverJournal(path).state, "BOOTSTRAPPED")
    assert.throws(() => replaceDurableTurnoverJournal(path, 0, bootstrapped), /REVISION_CONFLICT/)
  } finally {
    rmSync(directory, { recursive: true })
  }
})
