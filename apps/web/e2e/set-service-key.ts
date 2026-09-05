/**
 * Configure the Review service-role key — RUNNER ONLY.
 *
 *   npm --workspace apps/web run e2e:set-service-key
 *
 * Exists because the previous flow — "copy the key, then run this shell block" —
 * was error-prone by construction: copying the block in order to run it overwrote
 * the clipboard, so the block read its own text back and wrote that into the env
 * file. Secret entry belongs in the repository, as one command with no arguments
 * and no clipboard.
 *
 * Guarantees:
 *   - the value is read from the terminal with echo disabled, or from stdin;
 *   - it never passes through `argv`, so it cannot land in `ps` output or shell
 *     history;
 *   - it is validated by the *same* validator the preflight uses, so this command
 *     can never admit a value the run would later reject;
 *   - it is never printed — success says only `E2E_SUPABASE_SERVICE_ROLE_KEY=CONFIGURED`,
 *     and a rejection prints metadata only;
 *   - nothing contacts Review.
 */

import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

import { normaliseKey, validateServiceRoleKey } from "./helpers/credentials"
import { resolveWebRoot } from "./helpers/paths"
import { describeKey } from "./inspect-key"

const REVIEW_SUPABASE_REF = "rwfvxvbzaosgcyfxdjpt"
const TARGET_VARIABLE = "E2E_SUPABASE_SERVICE_ROLE_KEY"

/** Seed used only when no local env file exists yet. Non-secret values only. */
const SEED = [
  "# Untracked local E2E configuration. Never commit.",
  "",
  "E2E_BASE_URL=https://evol-os-review.vercel.app",
  `E2E_SUPABASE_URL=https://${REVIEW_SUPABASE_REF}.supabase.co`,
  "E2E_SUPABASE_ANON_KEY=",
  `${TARGET_VARIABLE}=`,
  "E2E_EMAIL_DOMAIN=evol-e2e.invalid",
  "E2E_ALLOW_NON_REVIEW_TARGET=false",
  "",
].join("\n")

/**
 * Replace the variable's line, or append it. Every other line is preserved
 * byte-for-byte, including a previously corrupted value for this same variable.
 */
export function upsertEnvLine(content: string, name: string, value: string): string {
  const lines = content.split("\n")
  const pattern = new RegExp(`^\\s*(export\\s+)?${name}\\s*=`)
  let replaced = false

  const next = lines.map((line) => {
    if (!replaced && pattern.test(line)) {
      replaced = true
      return `${name}=${value}`
    }
    return line
  })

  if (!replaced) {
    if (next.length > 0 && next[next.length - 1] === "") next.splice(next.length - 1, 0, `${name}=${value}`)
    else next.push(`${name}=${value}`)
  }

  return next.join("\n")
}

/** Read a line from the terminal without echoing it. */
function promptHidden(question: string): Promise<string> {
  const input = process.stdin

  if (!input.isTTY) {
    // Piped input: still never argv. Useful for CI and for tests.
    return Promise.resolve(readFileSync(0, "utf8"))
  }

  return new Promise((resolvePrompt, rejectPrompt) => {
    process.stdout.write(question)
    const previousRaw = input.isRaw ?? false
    input.setRawMode(true)
    input.resume()
    input.setEncoding("utf8")

    let buffer = ""

    const finish = (error?: Error) => {
      input.removeListener("data", onData)
      input.setRawMode(previousRaw)
      input.pause()
      process.stdout.write("\n")
      if (error) rejectPrompt(error)
      else resolvePrompt(buffer)
    }

    const onData = (chunk: string) => {
      for (const char of chunk) {
        switch (char) {
          case "\r":
          case "\n":
            finish()
            return
          case "\u0003": // Ctrl+C
            finish(new Error("cancelled"))
            return
          case "\u007f": // Backspace or Delete
          case "\b":
            buffer = buffer.slice(0, -1)
            break
          default:
            // Ignore other control characters rather than embedding them.
            if (char >= " ") buffer += char
        }
      }
    }

    input.on("data", onData)
  })
}

async function main(): Promise<void> {
  const webRoot = resolveWebRoot()
  const envPath = resolve(webRoot, ".env.e2e.local")

  let raw: string
  try {
    raw = await promptHidden(
      `Paste the Review service-role key for project ${REVIEW_SUPABASE_REF} (input hidden): `,
    )
  } catch {
    console.error("[e2e] cancelled — nothing was written.")
    process.exitCode = 1
    return
  }

  const key = normaliseKey(raw)
  const verdict = validateServiceRoleKey(key, REVIEW_SUPABASE_REF)

  if (!verdict.ok) {
    console.error(`[e2e] ${TARGET_VARIABLE}=REJECTED — ${verdict.reason}`)
    console.error("[e2e] metadata only — the value is never printed\n")
    for (const line of describeKey(raw)) console.error(line)
    console.error(
      "\n[e2e] Nothing was written. Copy the key from Supabase → Evol Review →" +
        "\n      Project Settings → API Keys → service_role → Reveal, then run this" +
        "\n      command again and paste at the prompt.",
    )
    process.exitCode = 1
    return
  }

  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : SEED
  writeFileSync(envPath, upsertEnvLine(existing, TARGET_VARIABLE, key), { mode: 0o600 })
  chmodSync(envPath, 0o600)

  console.log(`${TARGET_VARIABLE}=CONFIGURED`)
  console.log(`[e2e] written to apps/web/.env.e2e.local (mode 600, gitignored) — ${verdict.note}`)
  console.log("[e2e] next: npm --workspace apps/web run e2e:review")
}

if (process.argv[1] && /set-service-key\.(ts|js|mjs|cjs)$/.test(process.argv[1])) {
  void main()
}
