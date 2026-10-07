import assert from "node:assert/strict"
import test from "node:test"

import { createHash } from "node:crypto"

import { resolveCanonicalMain, resolveMigrationPayloadSha, type GitRunner } from "./repository-identity"

const A = "a".repeat(40)
const B = "b".repeat(40)

/** Answers `rev-parse <rev>` from a table; anything else throws, as git would. */
function runner(table: Readonly<Record<string, string>>): GitRunner {
  return (args) => {
    assert.equal(args[0], "rev-parse", "the resolver must only resolve names, never mutate")
    const value = table[args[1] ?? ""]
    if (value === undefined) throw new Error("fatal: ambiguous argument")
    return `${value}\n`
  }
}

test("resolves canonical main when HEAD is exactly origin/main", () => {
  assert.equal(resolveCanonicalMain(runner({ "origin/main": A, HEAD: A })), A)
})

test("a value that is not a 40-hex sha is no evidence, not absence of drift", () => {
  for (const bad of ["", "   ", "HEAD", "a".repeat(39), "a".repeat(41), `${"a".repeat(39)}z`]) {
    assert.throws(
      () => resolveCanonicalMain(runner({ "origin/main": bad, HEAD: A })),
      /TURNOVER_BOOTSTRAP_MAIN_UNRESOLVABLE/,
      `expected refusal for ${JSON.stringify(bad)}`,
    )
  }
})

test("an unresolvable ref fails closed instead of defaulting", () => {
  assert.throws(
    () => resolveCanonicalMain(runner({ HEAD: A })),
    /TURNOVER_BOOTSTRAP_MAIN_UNRESOLVABLE/,
  )
  assert.throws(
    () => resolveCanonicalMain(runner({ "origin/main": A })),
    /TURNOVER_BOOTSTRAP_MAIN_UNRESOLVABLE/,
  )
})

test("a git failure is a refusal, never a silent pass", () => {
  assert.throws(
    () => resolveCanonicalMain(() => { throw new Error("git not found") }),
    /TURNOVER_BOOTSTRAP_MAIN_UNRESOLVABLE/,
  )
})

test("HEAD that merely descends from canonical main is refused", () => {
  // A branch holding canonical main as an ancestor is NOT canonical main: a
  // single-shot remote mutation run from it would be attributed to a commit that
  // never contained the tooling that performed it.
  assert.throws(
    () => resolveCanonicalMain(runner({ "origin/main": A, HEAD: B })),
    /TURNOVER_BOOTSTRAP_MAIN_NOT_CHECKED_OUT/,
  )
})

test("the resolved value is the measurement, not a pin", async () => {
  // The whole defect was a producer returning the expected constant. Prove the
  // resolver reports whatever the repository actually says, including a value
  // that disagrees with any pin the runner holds.
  const { EXPECTED_MAIN } = await import("./bootstrap-runner")
  const measured = resolveCanonicalMain(runner({ "origin/main": B, HEAD: B }))
  assert.equal(measured, B)
  assert.notEqual(measured, EXPECTED_MAIN)
})

// ---------------------------------------------------------------------------
// migration payload identity — same defect, same principle
// ---------------------------------------------------------------------------

const ROOT = "/repo"
const PAYLOAD = Buffer.from("create function public.get_company_turnover_v1() ...\n")
const PAYLOAD_SHA = createHash("sha256").update(PAYLOAD).digest("hex")

function migrationDeps(
  entries: readonly string[],
  overrides: Partial<{ root: string; listDir: (path: string) => readonly string[]; readFile: (path: string) => Buffer }> = {},
) {
  return {
    run: ((args) => {
      assert.deepEqual([...args], ["rev-parse", "--show-toplevel"])
      return `${overrides.root ?? ROOT}\n`
    }) as GitRunner,
    listDir: overrides.listDir ?? ((path: string) => {
      assert.equal(path, `${ROOT}/supabase/migrations`)
      return entries
    }),
    readFile: overrides.readFile ?? (() => PAYLOAD),
  }
}

test("measures the sha256 of the single matching migration payload", () => {
  const sha = resolveMigrationPayloadSha("0142", migrationDeps([
    "0141_create_company_assessment_summary_read_boundary.sql",
    "0142_create_company_turnover_boundary.sql",
  ]))
  assert.equal(sha, PAYLOAD_SHA)
})

test("an ambiguous payload identity refuses instead of picking one", () => {
  // Earned, not theoretical: a local DB gate once applied 0126…0139 twice
  // because macOS had left byte-identical `"<name> 2.sql"` duplicates beside
  // the canonical files.
  assert.throws(
    () => resolveMigrationPayloadSha("0142", migrationDeps([
      "0142_create_company_turnover_boundary.sql",
      "0142_create_company_turnover_boundary 2.sql",
    ])),
    /TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE/,
  )
})

test("a missing payload is a refusal, never an empty hash", () => {
  assert.throws(
    () => resolveMigrationPayloadSha("0142", migrationDeps(["0141_something.sql"])),
    /TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE/,
  )
})

test("a non-.sql entry sharing the version prefix does not count as the payload", () => {
  assert.throws(
    () => resolveMigrationPayloadSha("0142", migrationDeps(["0142_create_company_turnover_boundary.sql.bak"])),
    /TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE/,
  )
})

test("an empty payload file is refused rather than hashed", () => {
  assert.throws(
    () => resolveMigrationPayloadSha("0142", migrationDeps(
      ["0142_create_company_turnover_boundary.sql"],
      { readFile: () => Buffer.alloc(0) },
    )),
    /TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE/,
  )
})

test("unresolvable root, unreadable directory and unreadable file all fail closed", () => {
  assert.throws(
    () => resolveMigrationPayloadSha("0142", { run: () => { throw new Error("not a repository") } }),
    /TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE/,
  )
  assert.throws(
    () => resolveMigrationPayloadSha("0142", migrationDeps([], { root: "" })),
    /TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE/,
  )
  assert.throws(
    () => resolveMigrationPayloadSha("0142", migrationDeps([], {
      listDir: () => { throw new Error("ENOENT") },
    })),
    /TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE/,
  )
  assert.throws(
    () => resolveMigrationPayloadSha("0142", migrationDeps(
      ["0142_create_company_turnover_boundary.sql"],
      { readFile: () => { throw new Error("EACCES") } },
    )),
    /TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE/,
  )
})

test("the measured payload hash is the real 0142 in this repository", async () => {
  // End-to-end against the actual working tree, with no injection: if the
  // measurement and the pin ever diverge, that is a real finding, not a test
  // failure to paper over.
  const { EXPECTED_MIGRATION_SHA } = await import("./bootstrap-runner")
  assert.equal(resolveMigrationPayloadSha("0142"), EXPECTED_MIGRATION_SHA)
})
