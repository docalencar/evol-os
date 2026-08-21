import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const panel = readFileSync(
  new URL("./employee-import-action-panel.tsx", import.meta.url),
  "utf8"
)

test("primary result no longer exposes internal plan-item mechanics", () => {
  assert.doesNotMatch(panel, /Itens no plano/)
  assert.doesNotMatch(panel, /Ignorados/)
  // The raw counter tiles are gone from the success card.
  assert.doesNotMatch(panel, /\{result\.totalItems\}/)
  assert.doesNotMatch(panel, /\{result\.skippedItems\}/)
  assert.doesNotMatch(panel, /\{result\.appliedItems\}/)
})

test("the business-outcome summary is rendered", () => {
  assert.match(panel, /presentImportActivationSummary\(result\)/)
  assert.match(panel, /Mudanças realizadas/)
  assert.match(panel, /activation\.changes\.map/)
  assert.match(panel, /activation\.alreadyUpToDateMessage/)
})

test("errors remain prominent when present", () => {
  assert.match(panel, /result\.errors\.length > 0/)
  assert.match(panel, /result\.errors\.map/)
})

test("guided next actions and optional recommendation are preserved", () => {
  assert.match(panel, /activation\.nextActions\.map/)
  assert.match(panel, /activation\.recommendation/)
})

test("exploration links open in a new tab so the ephemeral result is preserved", () => {
  // The import result is client-only state; opening in a new tab keeps it alive
  // so the operator can return and choose another path.
  assert.match(panel, /target="_blank"/)
  assert.match(panel, /rel="noopener noreferrer"/)
  assert.match(panel, /não perder este\s+resumo/)
})

test("no DB/RPC/persistence access is introduced by the result summary", () => {
  assert.doesNotMatch(panel, /\.from\(|\.rpc\(|create_tenant_|persistOrganizationTimeline/)
})
