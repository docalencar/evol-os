/**
 * Path resolution must work under every loader the harness is executed by.
 *
 * The regression this guards: `import.meta.url` is a *syntax error* in the
 * CommonJS output Playwright produces, which crashed config load before any test
 * could run. Resolution must therefore depend on neither `import.meta` nor
 * `__dirname`.
 */

import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

import { resolveWebRoot } from "./paths"

test("resolves apps/web when invoked from the web workspace", () => {
  const root = resolveWebRoot()
  const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as {
    name?: string
  }
  assert.equal(manifest.name, "@evol/web")
})

test("resolves the same root from the repository root and from a nested directory", () => {
  const fromWeb = resolveWebRoot()
  const repoRoot = resolve(fromWeb, "..", "..")
  assert.equal(resolveWebRoot(repoRoot), fromWeb)
  assert.equal(resolveWebRoot(resolve(fromWeb, "e2e", "helpers")), fromWeb)
})

test("the resolved root actually contains the harness", () => {
  const root = resolveWebRoot()
  assert.ok(existsSync(resolve(root, "e2e", "helpers", "env.ts")))
  assert.ok(existsSync(resolve(root, "playwright.config.ts")))
})

/** Remove block and line comments so prose about the bug is not mistaken for it. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1")
}

test("no harness module depends on the ESM-only module-URL global", () => {
  const root = resolveWebRoot()
  const files = [
    "e2e/helpers/env.ts",
    "e2e/helpers/paths.ts",
    "e2e/helpers/run-context.ts",
    "e2e/helpers/admin-client.ts",
    "e2e/helpers/target-identity.ts",
    "e2e/helpers/credentials.ts",
    "e2e/preflight.ts",
    "e2e/global-setup.ts",
    "e2e/global-teardown.ts",
    "playwright.config.ts",
  ]
  for (const file of files) {
    const code = stripComments(readFileSync(resolve(root, file), "utf8"))
    assert.equal(
      /\bimport\s*\.\s*meta\b/.test(code),
      false,
      `${file} uses the ESM module-URL global in executable code, which is a syntax ` +
        `error under Playwright's CommonJS loader`,
    )
  }
})

test("the comment stripper does not hide real usage", () => {
  assert.equal(/\bimport\s*\.\s*meta\b/.test(stripComments("const u = import.meta.url")), true)
  assert.equal(/\bimport\s*\.\s*meta\b/.test(stripComments("// mentions import.meta only")), false)
  assert.equal(/\bimport\s*\.\s*meta\b/.test(stripComments("/* import.meta in prose */")), false)
})
