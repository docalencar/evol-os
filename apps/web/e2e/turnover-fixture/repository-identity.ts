/**
 * Local repository identity for the governed Turnover bootstrap.
 *
 * WHY THIS MODULE EXISTS
 *
 * The canonical main is **not a remote fact**. Review's database knows the
 * migration ledger, the installed boundaries and the ACLs, but it has no idea
 * which Git commit is `main`. So a "remote snapshot" cannot carry it honestly —
 * and the first operational transport did not: it filled the field with
 * `canonicalMain: EXPECTED_MAIN`, which made
 *
 *   if (snapshot.canonicalMain !== EXPECTED_MAIN) throw TURNOVER_BOOTSTRAP_STALE_MAIN
 *
 * compare the constant against itself. The guard could not fire, and the durable
 * evidence recorded the pin rather than the commit the bootstrap actually ran
 * against (finding `TURNOVER_BOOTSTRAP_STALE_MAIN`).
 *
 * The fix is to measure the fact where it lives. This module reads it from the
 * local repository so the existing comparison in `assertPre` becomes real
 * without changing that assertion, its signature or the evidence schema.
 *
 * It is read-only: `git rev-parse` only resolves names. No fetch, no checkout,
 * no write, and nothing here contacts any environment.
 */

import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

export type GitRunner = (args: readonly string[]) => string
export type RepositoryIdentityDeps = Readonly<{
  run?: GitRunner
  listDir?: (path: string) => readonly string[]
  readFile?: (path: string) => Buffer
}>

const SHA40 = /^[0-9a-f]{40}$/
const MIGRATIONS_DIR = join("supabase", "migrations")

const defaultRunner: GitRunner = (args) =>
  execFileSync("git", [...args], { encoding: "utf8", timeout: 15_000, stdio: ["ignore", "pipe", "ignore"] })

function revParse(run: GitRunner, revision: string): string {
  let raw: string
  try {
    raw = run(["rev-parse", revision])
  } catch {
    // A name that does not resolve is not "no drift"; it is no evidence.
    throw new Error("TURNOVER_BOOTSTRAP_MAIN_UNRESOLVABLE")
  }
  const sha = raw.trim()
  if (!SHA40.test(sha)) throw new Error("TURNOVER_BOOTSTRAP_MAIN_UNRESOLVABLE")
  return sha
}

/**
 * The commit this bootstrap is actually running from.
 *
 * `origin/main` is the factual authority for canonical main (OPERATING-METHOD
 * §1), and `HEAD` must equal it: a branch that merely has canonical main as an
 * ancestor is not canonical main, and running a single-shot remote mutation from
 * one would attribute the mutation to a commit that never contained the tooling
 * that performed it.
 */
export function resolveCanonicalMain(run: GitRunner = defaultRunner): string {
  const canonical = revParse(run, "origin/main")
  const head = revParse(run, "HEAD")
  if (head !== canonical) throw new Error("TURNOVER_BOOTSTRAP_MAIN_NOT_CHECKED_OUT")
  return canonical
}

/**
 * The sha256 of the migration payload that actually sits in the working tree.
 *
 * Same defect, same principle as `canonicalMain`: the payload hash is a local
 * repository fact, and the transport was filling the field with
 * `EXPECTED_MIGRATION_SHA`, so the hash half of
 * `TURNOVER_BOOTSTRAP_MIGRATION_MISMATCH` compared the constant against itself.
 * The ledger count beside it was always a real remote read; only the hash was
 * fabricated.
 *
 * The file is located by **name count**, never by assuming a filename: exactly
 * one entry in `supabase/migrations` may begin with the version. That is not a
 * theoretical guard — a stale local DB gate once applied `0126`…`0139` twice
 * because macOS had left byte-identical `"<name> 2.sql"` duplicates beside the
 * canonical files, and `supabase db reset` enumerates the directory. Two files
 * sharing a version prefix means the payload identity is ambiguous, and an
 * ambiguous identity must refuse rather than pick one.
 */
export function resolveMigrationPayloadSha(
  version: string,
  deps: RepositoryIdentityDeps = {},
): string {
  const run = deps.run ?? defaultRunner
  const listDir = deps.listDir ?? ((path) => readdirSync(path))
  const readFile = deps.readFile ?? ((path) => readFileSync(path))

  let root: string
  try {
    root = run(["rev-parse", "--show-toplevel"]).trim()
  } catch {
    throw new Error("TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE")
  }
  if (!root) throw new Error("TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE")

  const directory = join(root, MIGRATIONS_DIR)
  let entries: readonly string[]
  try {
    entries = listDir(directory)
  } catch {
    throw new Error("TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE")
  }

  const matches = entries.filter((name) => name.startsWith(version) && name.endsWith(".sql"))
  if (matches.length !== 1) throw new Error("TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE")

  let payload: Buffer
  try {
    payload = readFile(join(directory, matches[0]))
  } catch {
    throw new Error("TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE")
  }
  if (payload.length === 0) throw new Error("TURNOVER_BOOTSTRAP_MIGRATION_UNRESOLVABLE")

  return createHash("sha256").update(payload).digest("hex")
}
