#!/usr/bin/env node

import { createHash } from "node:crypto"
import { execFileSync } from "node:child_process"
import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

const PATTERN = /^(\d{4})_(.+)\.sql$/
const REMOTE_TARGETS = new Set(["REVIEW", "PRODUCTION", "LEGACY"])

function fail(message) {
  process.stderr.write(`migration-drift: ${message}\n`)
  process.exit(2)
}

function parseArguments(argv) {
  const options = {
    target: null,
    expectedProjectRef: null,
    historyFile: null,
    json: false,
    requireCommitted: false,
    maxLag: null,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--json") options.json = true
    else if (argument === "--require-committed") options.requireCommitted = true
    else if (argument === "--target") options.target = argv[++index]?.toUpperCase()
    else if (argument === "--expected-project-ref") options.expectedProjectRef = argv[++index]
    else if (argument === "--history-file") options.historyFile = argv[++index]
    else if (argument === "--max-lag") options.maxLag = Number(argv[++index])
    else fail(`unknown argument: ${argument}`)
  }

  if (!["LOCAL", ...REMOTE_TARGETS].includes(options.target)) {
    fail("--target must be LOCAL, REVIEW, PRODUCTION, or LEGACY")
  }
  if (REMOTE_TARGETS.has(options.target)) {
    if (!/^[a-z]{20}$/.test(options.expectedProjectRef ?? "")) {
      fail("remote targets require --expected-project-ref")
    }
    if (!options.historyFile) fail("remote targets require --history-file")
  }
  if (options.maxLag !== null && (!Number.isInteger(options.maxLag) || options.maxLag < 0)) {
    fail("--max-lag must be a non-negative integer")
  }
  return options
}

function hash(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex")
}

function localMigrations(root) {
  const directory = resolve(root, "supabase/migrations")
  const tracked = new Set(
    execFileSync("git", ["ls-files", "--", "supabase/migrations"], {
      cwd: root,
      encoding: "utf8",
    }).trim().split("\n").filter(Boolean).map((path) => resolve(root, path))
  )
  const migrations = readdirSync(directory).map((fileName) => {
    const match = PATTERN.exec(fileName)
    if (!match) return null
    const path = resolve(directory, fileName)
    return { version: match[1], name: match[2], sha256: hash(path), committed: tracked.has(path) }
  }).filter(Boolean).sort((a, b) => a.version.localeCompare(b.version))

  const versions = migrations.map(({ version }) => version)
  if (new Set(versions).size !== versions.length) fail("duplicate local migration version")
  migrations.forEach((migration, index) => {
    const expected = String(index + 1).padStart(4, "0")
    if (migration.version !== expected) {
      fail(`local migration-number gap: expected ${expected}, found ${migration.version}`)
    }
  })
  return migrations
}

function remoteEvidence(path, expectedRef) {
  let evidence
  try {
    evidence = JSON.parse(readFileSync(resolve(path), "utf8"))
  } catch {
    fail("history evidence must be readable JSON")
  }
  if (evidence.projectRef !== expectedRef) {
    fail(`environment identity mismatch: expected ${expectedRef}, found ${evidence.projectRef ?? "UNKNOWN"}`)
  }
  if (!Array.isArray(evidence.migrations)) fail("history evidence needs a migrations array")
  const migrations = evidence.migrations.map((migration) => {
    if (!migration || !/^\d{4}$/.test(migration.version)) fail("invalid remote migration version")
    return {
      version: migration.version,
      sha256: typeof migration.sha256 === "string" ? migration.sha256 : null,
    }
  }).sort((a, b) => a.version.localeCompare(b.version))
  if (new Set(migrations.map(({ version }) => version)).size !== migrations.length) {
    fail("duplicate remote migration version")
  }
  migrations.forEach((migration, index) => {
    const expected = String(index + 1).padStart(4, "0")
    if (migration.version !== expected) {
      fail(`remote migration-number gap: expected ${expected}, found ${migration.version}`)
    }
  })
  return migrations
}

const options = parseArguments(process.argv.slice(2))
const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const local = localMigrations(root)
const committed = local.filter(({ committed: value }) => value)
const localOnly = local.filter(({ committed: value }) => !value)
const summary = {
  target: options.target,
  expectedProjectRef: options.expectedProjectRef,
  latestLocal: local.at(-1)?.version ?? null,
  latestCommitted: committed.at(-1)?.version ?? null,
  latestRemote: null,
  lag: null,
  localOnly: localOnly.map(({ version }) => version),
  missingRemote: [], remoteOnly: [], checksumDrift: [], checksumUnknown: [],
  status: "ALIGNED", messages: [],
}

if (options.requireCommitted && localOnly.length) {
  summary.status = "BLOCKED"
  summary.messages.push("uncommitted local migrations are not promotable")
}

if (REMOTE_TARGETS.has(options.target)) {
  const remote = remoteEvidence(options.historyFile, options.expectedProjectRef)
  const localByVersion = new Map(committed.map((migration) => [migration.version, migration]))
  const remoteByVersion = new Map(remote.map((migration) => [migration.version, migration]))
  summary.latestRemote = remote.at(-1)?.version ?? null
  summary.missingRemote = committed.filter(({ version }) => !remoteByVersion.has(version)).map(({ version }) => version)
  summary.remoteOnly = remote.filter(({ version }) => !localByVersion.has(version)).map(({ version }) => version)
  for (const migration of remote) {
    const localMigration = localByVersion.get(migration.version)
    if (!localMigration) continue
    if (!migration.sha256) summary.checksumUnknown.push(migration.version)
    else if (migration.sha256 !== localMigration.sha256) summary.checksumDrift.push(migration.version)
  }
  summary.lag = Math.max(0, Number(summary.latestCommitted ?? 0) - Number(summary.latestRemote ?? 0))
  if (summary.remoteOnly.length || summary.checksumDrift.length) {
    summary.status = "BLOCKED"
    summary.messages.push("remote-only migration or historical checksum drift")
  }
  const maxLag = options.maxLag ?? (options.target === "REVIEW" ? 3 : null)
  if (maxLag !== null && summary.lag > maxLag) {
    summary.status = "BLOCKED"
    summary.messages.push(`remote lag ${summary.lag} exceeds maximum ${maxLag}`)
  } else if (summary.lag > 0 && summary.status !== "BLOCKED") {
    summary.status = "WARNING"
    summary.messages.push(`remote is ${summary.lag} committed migration(s) behind`)
  }
  if (summary.checksumUnknown.length && summary.status === "ALIGNED") {
    summary.status = "WARNING"
    summary.messages.push("remote evidence lacks historical checksums")
  }
}

if (options.json) process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`)
else process.stdout.write([
  `Migration drift: ${summary.status}`,
  `Target: ${summary.target}`,
  `Project ref: ${summary.expectedProjectRef ?? "LOCAL"}`,
  `Latest local: ${summary.latestLocal ?? "NONE"}`,
  `Latest committed: ${summary.latestCommitted ?? "NONE"}`,
  `Latest remote: ${summary.latestRemote ?? "N/A"}`,
  `Lag: ${summary.lag ?? "N/A"}`,
  `Local only: ${summary.localOnly.join(", ") || "none"}`,
  `Missing remotely: ${summary.missingRemote.join(", ") || "none"}`,
  `Remote only: ${summary.remoteOnly.join(", ") || "none"}`,
  `Checksum drift: ${summary.checksumDrift.join(", ") || "none"}`,
  ...summary.messages.map((message) => `- ${message}`),
].join("\n") + "\n")

process.exit(summary.status === "BLOCKED" ? 2 : 0)
