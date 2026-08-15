import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const source = readFileSync(
  resolve(process.cwd(), "src/features/tenant-access/queries/get-tenant-switcher-context.ts"),
  "utf8",
)
const layout = readFileSync(
  resolve(process.cwd(), "src/app/(dashboard)/layout.tsx"),
  "utf8",
)
const header = readFileSync(
  resolve(process.cwd(), "src/components/layout/header.tsx"),
  "utf8",
)

test("read model composes current company with the existing authorized option loader", () => {
  assert.match(source, /import "server-only"/)
  assert.match(source, /getCurrentCompanyContext\(\)/)
  assert.match(source, /loadTenantSelectionOptions\(/)
  assert.match(source, /selection\.status === "options" \? selection\.options : \[\]/)
})

test("single or failed option reads degrade to current-company visibility without inventing choices", () => {
  assert.match(source, /options\.length > 1/)
  assert.doesNotMatch(source, /companyId:\s*current\.companyId[\s\S]{0,80}options/)
})

test("dashboard loads server context and the header renders the switcher", () => {
  assert.match(layout, /async function DashboardLayout/)
  assert.match(layout, /getTenantSwitcherContext\(\)/)
  assert.match(layout, /<Header tenantContext=\{tenantContext\} \/>/)
  assert.match(header, /<TenantSwitcher \{\.\.\.tenantContext\} \/>/)
})
