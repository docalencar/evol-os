/**
 * Workspace path resolution — RUNNER ONLY.
 *
 * Deliberately avoids both `import.meta.url` and `__dirname`.
 *
 * Neither `package.json` declares `"type": "module"`, so Playwright transpiles the
 * config and everything it imports to **CommonJS** — where `import.meta` is a
 * syntax error, not merely undefined. `__dirname` would work there but would break
 * the moment the same module is loaded by an ESM loader (`tsx`, a future
 * `"type": "module"`, an IDE runner).
 *
 * Walking up from `process.cwd()` for the `@evol/web` package marker is correct
 * under every loader and from any invocation directory — repo root or `apps/web`.
 */

import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"

const WEB_PACKAGE_NAME = "@evol/web"

function isWebRoot(candidate: string): boolean {
  const manifest = resolve(candidate, "package.json")
  if (!existsSync(manifest)) return false
  try {
    return (JSON.parse(readFileSync(manifest, "utf8")) as { name?: string }).name === WEB_PACKAGE_NAME
  } catch {
    return false
  }
}

/**
 * Absolute path of `apps/web`.
 *
 * Searches upward from the working directory, then downward into `apps/web` for
 * the common case of being invoked from the repository root.
 */
export function resolveWebRoot(from: string = process.cwd()): string {
  let current = resolve(from)

  for (;;) {
    if (isWebRoot(current)) return current

    const nested = resolve(current, "apps", "web")
    if (isWebRoot(nested)) return nested

    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }

  throw new Error(
    `E2E_WEB_ROOT_NOT_FOUND: could not locate the ${WEB_PACKAGE_NAME} package from ` +
      `${from}. Run the harness from the repository root or from apps/web.`,
  )
}
