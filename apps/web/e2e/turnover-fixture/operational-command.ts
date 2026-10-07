import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync } from "node:fs"
import { resolve } from "node:path"

import { executeGovernedTurnoverBootstrap } from "./bootstrap-entrypoint"
import { createDurableTurnoverJournal } from "./journal-store"
import { REVIEW_REF } from "./lifecycle"
import { operationalReviewTransport, type OperationalCredentials } from "./operational-transport"

export const OWNERSHIP_JOURNAL_PATH = resolve(process.cwd(), ".turnover-fixture", "durable-ownership.json")
export const EVIDENCE_PATH = resolve(process.cwd(), ".turnover-fixture", "bootstrap-evidence.json")

export type CommandDependencies = Readonly<{
  loadCredentials(): Promise<OperationalCredentials>
  execute: typeof executeGovernedTurnoverBootstrap
  transport: typeof operationalReviewTransport
  stdout(message: string): void
  stderr(message: string): void
  statePaths?: Readonly<{ journal: string; evidence: string }>
}>

function parseDatabaseUrl(value: string): OperationalCredentials["database"] {
  const url = new URL(value)
  if (!url.protocol.startsWith("postgres") || url.username !== `postgres.${REVIEW_REF}` || !url.password || !url.hostname.endsWith(".pooler.supabase.com") || url.port !== "5432" || url.pathname !== "/postgres") throw new Error("TURNOVER_BOOTSTRAP_DATABASE_URL_INVALID")
  return { host: url.hostname, port: url.port, user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), name: "postgres" }
}

export async function loadOperationalCredentials(): Promise<OperationalCredentials> {
  const { e2eEnv } = await import("../helpers/env")
  const env = e2eEnv()
  if (env.supabaseRef !== REVIEW_REF || env.allowNonReviewTarget) throw new Error("TURNOVER_BOOTSTRAP_TARGET_NOT_REVIEW")
  const raw = process.env.T_E2E0C_REVIEW_DB_URL?.trim() || execFileSync("security", ["find-generic-password", "-s", "evol-os-review-pooler-url", "-a", process.env.USER ?? "", "-w"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
  return { supabaseUrl: env.supabaseUrl, anonKey: env.anonKey, serviceRoleKey: env.serviceRoleKey, database: parseDatabaseUrl(raw), emailDomain: env.emailDomain }
}

export async function runOperationalCommand(args: readonly string[], deps: CommandDependencies): Promise<number> {
  const paths = deps.statePaths ?? { journal: OWNERSHIP_JOURNAL_PATH, evidence: EVIDENCE_PATH }
  if (args.length === 1 && args[0] === "--validate-only") {
    deps.stdout(`TURNOVER_BOOTSTRAP_COMMAND=VALID REVIEW_REF=${REVIEW_REF}`)
    deps.stdout(`JOURNAL_PATH=${paths.journal}`)
    deps.stdout(`EVIDENCE_PATH=${paths.evidence}`)
    return 0
  }
  if (args.length !== 0) { deps.stderr("TURNOVER_BOOTSTRAP_ARGUMENT_REJECTED"); return 1 }
  try {
    const credentials = await deps.loadCredentials()
    const directory = resolve(paths.journal, "..")
    mkdirSync(directory, { recursive: true, mode: 0o700 })
    if (!existsSync(paths.journal)) createDurableTurnoverJournal(paths.journal)
    const result = await deps.execute({ journalPath: paths.journal, evidencePath: paths.evidence, transport: deps.transport(credentials) })
    deps.stdout(`TURNOVER_BOOTSTRAP_RESULT=${result.state}`)
    deps.stdout(`EVIDENCE_PATH=${paths.evidence}`)
    return result.state === "COVERAGE_STARTED" ? 0 : 1
  } catch (cause) {
    const code = cause instanceof Error && cause.message.includes("UNKNOWN_REMOTE_OUTCOME") ? "UNKNOWN_REMOTE_OUTCOME" : "FAILED"
    deps.stderr(`TURNOVER_BOOTSTRAP_RESULT=${code}`)
    return code === "UNKNOWN_REMOTE_OUTCOME" ? 2 : 1
  }
}

async function main(): Promise<void> {
  process.exitCode = await runOperationalCommand(process.argv.slice(2), { loadCredentials: loadOperationalCredentials, execute: executeGovernedTurnoverBootstrap, transport: operationalReviewTransport, stdout: console.log, stderr: console.error })
}

if (process.argv[1] && /operational-command\.(ts|js|mjs|cjs)$/.test(process.argv[1])) void main()
