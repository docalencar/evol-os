/**
 * Metadata-only key diagnostic — RUNNER ONLY.
 *
 *   pbpaste | npm --workspace apps/web run e2e:inspect-key
 *   npm --workspace apps/web run e2e:inspect-key -- --from-env
 *
 * Answers "why was my key rejected?" without ever revealing it.
 *
 * Reported: total length, prefix class, length after the prefix, which character
 * classes appear, whether it parses as a JWT, and for a JWT the decoded `role`
 * and `ref` — both of which are non-secret identity claims.
 *
 * Never reported: the value, any substring of the random part, or any hash of it.
 * A hash would be a stable identifier for the secret, which is precisely what a
 * diagnostic must not hand out.
 *
 * Non-ASCII codepoints ARE named, because they cannot occur in a real key — a
 * `U+2022 BULLET` means a masked field was copied instead of the value, and that
 * is the single most useful thing this tool can tell you.
 */

import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

import { inspectKey, normaliseKey, validateServiceRoleKey } from "./helpers/credentials"
import { resolveWebRoot } from "./helpers/paths"

const REVIEW_SUPABASE_REF = "rwfvxvbzaosgcyfxdjpt"

type Composition = Readonly<{
  lower: number
  upper: number
  digit: number
  dash: number
  underscore: number
  plus: number
  slash: number
  equals: number
  dot: number
  whitespace: number
  otherAscii: number
  nonAscii: string[]
}>

function compose(text: string): Composition {
  const counts = {
    lower: 0, upper: 0, digit: 0, dash: 0, underscore: 0,
    plus: 0, slash: 0, equals: 0, dot: 0, whitespace: 0, otherAscii: 0,
  }
  const nonAscii = new Set<string>()

  for (const char of text) {
    const code = char.codePointAt(0) ?? 0
    if (code > 127) {
      nonAscii.add(`U+${code.toString(16).toUpperCase().padStart(4, "0")}`)
    } else if (/[a-z]/.test(char)) counts.lower += 1
    else if (/[A-Z]/.test(char)) counts.upper += 1
    else if (/[0-9]/.test(char)) counts.digit += 1
    else if (char === "-") counts.dash += 1
    else if (char === "_") counts.underscore += 1
    else if (char === "+") counts.plus += 1
    else if (char === "/") counts.slash += 1
    else if (char === "=") counts.equals += 1
    else if (char === ".") counts.dot += 1
    else if (/\s/.test(char)) counts.whitespace += 1
    else counts.otherAscii += 1
  }

  return Object.freeze({ ...counts, nonAscii: [...nonAscii] })
}

function prefixClass(key: string): { label: string; rest: string } {
  for (const prefix of ["sb_secret_", "sb_publishable_"]) {
    if (key.startsWith(prefix)) return { label: prefix + "…", rest: key.slice(prefix.length) }
  }
  if (key.startsWith("eyJ")) return { label: "eyJ… (JWT-shaped)", rest: key }
  if (key.startsWith("sb_")) return { label: "sb_… (unknown sb prefix)", rest: key.slice(3) }
  return { label: "(no recognised prefix)", rest: key }
}

function readFromStdin(): string {
  try {
    return readFileSync(0, "utf8")
  } catch {
    return ""
  }
}

function readFromEnvFile(): string {
  const file = resolve(resolveWebRoot(), ".env.e2e.local")
  if (!existsSync(file)) return ""
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("E2E_SUPABASE_SERVICE_ROLE_KEY=")) {
      return trimmed.slice("E2E_SUPABASE_SERVICE_ROLE_KEY=".length)
    }
  }
  return ""
}

export function describeKey(raw: string): string[] {
  const lines: string[] = []
  const hadOuterWhitespace = raw !== raw.replace(/^\s+|\s+$/g, "")
  const key = normaliseKey(raw)

  if (key === "") {
    return ["  value            : EMPTY (nothing supplied)"]
  }

  const { label, rest } = prefixClass(key)
  const composition = compose(rest)
  const info = inspectKey(key)

  lines.push(`  total length     : ${key.length}`)
  lines.push(`  prefix class     : ${label}`)
  lines.push(`  after prefix     : ${rest.length} chars`)
  lines.push(`  outer whitespace : ${hadOuterWhitespace ? "YES (trimmed before checks)" : "no"}`)

  const present = Object.entries(composition)
    .filter(([name, value]) => name !== "nonAscii" && (value as number) > 0)
    .map(([name, value]) => `${name}=${value as number}`)
  lines.push(`  characters       : ${present.join(" ") || "(none)"}`)

  if (composition.nonAscii.length > 0) {
    lines.push(`  NON-ASCII        : ${composition.nonAscii.join(" ")}`)
    lines.push(
      "                     A real API key is ASCII. U+2022 (bullet) means a masked",
      "                     field was copied instead of the revealed value.",
    )
  }
  if (composition.whitespace > 0) {
    lines.push("  WHITESPACE INSIDE: yes — the value was probably copied with a line break")
  }

  lines.push(`  classified as    : ${info.kind}`)
  if (info.kind.startsWith("jwt")) {
    lines.push(`  JWT role         : ${info.ref === null && !info.identityVerifiable ? "(undecodable)" : info.kind.replace("jwt-", "")}`)
    lines.push(`  JWT project ref  : ${info.ref ?? "(absent)"}`)
  }

  const verdict = validateServiceRoleKey(key, REVIEW_SUPABASE_REF)
  lines.push(
    verdict.ok
      ? `  VERDICT          : ACCEPTED — ${verdict.note}`
      : `  VERDICT          : REJECTED — ${verdict.reason}`,
  )

  return lines
}

function main(): void {
  const fromEnv = process.argv.includes("--from-env")
  const raw = fromEnv ? readFromEnvFile() : readFromStdin()

  console.log(
    fromEnv
      ? "[e2e] inspecting E2E_SUPABASE_SERVICE_ROLE_KEY from apps/web/.env.e2e.local"
      : "[e2e] inspecting the value piped on stdin",
  )
  console.log("[e2e] metadata only — the value is never printed\n")
  for (const line of describeKey(raw)) console.log(line)

  const ok = validateServiceRoleKey(normaliseKey(raw), REVIEW_SUPABASE_REF).ok
  if (!ok) process.exitCode = 1
}

if (process.argv[1] && /inspect-key\.(ts|js|mjs|cjs)$/.test(process.argv[1])) {
  main()
}
