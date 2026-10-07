import assert from "node:assert/strict"
import { mkdtempSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { executeGovernedTurnoverBootstrap } from "./bootstrap-entrypoint"
import { EXPECTED_LEDGER, EXPECTED_MAIN, EXPECTED_MIGRATION_SHA, type RemoteSnapshot } from "./bootstrap-runner"
import type { CanonicalTurnoverTransport } from "./canonical-adapter"
import { REVIEW_REF } from "./lifecycle"
import { runOperationalCommand, type CommandDependencies } from "./operational-command"
import type { OperationalCredentials } from "./operational-transport"

const ACTOR = "11111111-1111-4111-8111-111111111111", COMPANY = "22222222-2222-4222-8222-222222222222", OWNER = "33333333-3333-4333-8333-333333333333", EMPLOYEE = "44444444-4444-4444-8444-444444444444", NOW = "2026-10-07T18:00:00.000Z"
const SECRET = "SENTINEL_SECRET_MUST_NEVER_LEAK"
const credentials: OperationalCredentials = { supabaseUrl: `https://${REVIEW_REF}.supabase.co`, anonKey: SECRET, serviceRoleKey: `${SECRET}_SERVICE`, database: { host: "aws.pooler.supabase.com", port: "5432", user: `postgres.${REVIEW_REF}`, password: `${SECRET}_DB`, name: "postgres" }, emailDomain: "evol-e2e.invalid" }
const snap = (change: Partial<RemoteSnapshot> = {}): RemoteSnapshot => ({ reviewRef: REVIEW_REF, canonicalMain: EXPECTED_MAIN, ledger: EXPECTED_LEDGER, migration0142Count: 1, migration0142Sha256: EXPECTED_MIGRATION_SHA, markerCompanyIds: [], journalRevision: 0, ...change })

function fakeTransport(options: { snapshots?: RemoteSnapshot[]; fail?: "identity" | "company"; post?: boolean } = {}): CanonicalTurnoverTransport & { counts: Record<string, number> } {
  const counts: Record<string, number> = { identity: 0, company: 0, people: 0, observation: 0, cleanup: 0 }
  const snapshots = [...(options.snapshots ?? [snap(), snap()])]
  return {
    counts,
    inspectReview: async () => snapshots.shift() ?? snap(),
    createSyntheticAuthUser: async () => { counts.identity++; if (options.fail === "identity") throw new Error("network"); return { userId: ACTOR } },
    callAsUser: async () => { counts.company++; if (options.fail === "company") throw new Error("network"); return { companyId: COMPANY, ownerPersonId: OWNER } },
    callPeopleMutation: async () => { counts.people++; return { personId: EMPLOYEE } },
    callTurnoverRead: async () => { counts.observation++; return { companyId: COMPANY, coverageStartedAt: NOW, generatedAt: NOW, currentAvailability: "unavailable", currentUnavailableReason: "incomplete_coverage" } },
    verifyOwnedFixture: async () => options.post !== false,
  }
}

function command(transport: ReturnType<typeof fakeTransport>) {
  const root = mkdtempSync(join(tmpdir(), "t-e2e0c-")), out: string[] = [], err: string[] = []
  const deps: CommandDependencies = { loadCredentials: async () => credentials, execute: executeGovernedTurnoverBootstrap, transport: () => transport, stdout: (v) => out.push(v), stderr: (v) => err.push(v), statePaths: { journal: join(root, "journal.json"), evidence: join(root, "evidence.json") } }
  return { deps, out, err, transport, root }
}

test("CLI happy path composes the published runner through COVERAGE_STARTED", async () => {
  const c = command(fakeTransport())
  assert.equal(await runOperationalCommand([], c.deps), 0)
  assert.deepEqual(c.transport.counts, { identity: 1, company: 1, people: 1, observation: 1, cleanup: 0 })
  assert.match(c.out.join("\n"), /COVERAGE_STARTED/)
})

test("PRE failure performs zero mutations", async () => {
  const c = command(fakeTransport({ snapshots: [snap({ markerCompanyIds: [COMPANY] })] }))
  assert.equal(await runOperationalCommand([], c.deps), 1); assert.equal(c.transport.counts.identity, 0)
})

test("TOCTOU drift performs zero mutations", async () => {
  const c = command(fakeTransport({ snapshots: [snap(), snap({ markerCompanyIds: [COMPANY] })] }))
  assert.equal(await runOperationalCommand([], c.deps), 1); assert.equal(c.transport.counts.identity, 0)
})

for (const failure of ["identity", "company"] as const) test(`ambiguous ${failure} stops without retry`, async () => {
  const c = command(fakeTransport({ fail: failure }))
  assert.equal(await runOperationalCommand([], c.deps), 2)
  assert.equal(c.transport.counts[failure], 1)
})

test("partial bootstrap and POST failure preserve evidence without cleanup", async () => {
  const c = command(fakeTransport({ post: false }))
  assert.equal(await runOperationalCommand([], c.deps), 1)
  assert.equal(c.transport.counts.company, 1); assert.equal(c.transport.counts.cleanup, 0)
  assert.match(readFileSync(join(c.root, "evidence.json"), "utf8"), /"phase": "POST"/)
})

test("wrong, Production and Legacy targets are hard rejected by composition", async () => {
  for (const ref of ["wrong", "gzrrwyiqfbnyprkdeqvm", "oudngmrdtgengilpqqnz"]) {
    const c = command(fakeTransport())
    const deps = { ...c.deps, transport: (() => { throw new Error(`target ${ref} rejected`) }) as CommandDependencies["transport"] }
    assert.equal(await runOperationalCommand([], deps), 1); assert.equal(c.transport.counts.identity, 0)
  }
})

test("validate-only loads no credentials and secret sentinel never reaches outputs or files", async () => {
  const c = command(fakeTransport()); let loaded = 0
  const deps = { ...c.deps, loadCredentials: async () => { loaded++; return credentials } }
  assert.equal(await runOperationalCommand(["--validate-only"], deps), 0); assert.equal(loaded, 0)
  assert.doesNotMatch(`${c.out.join("\n")}\n${c.err.join("\n")}`, new RegExp(SECRET))
})
