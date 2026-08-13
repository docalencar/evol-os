import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

import {
  describeSmokeIssueResult,
  type SmokeIssueState,
} from "./real-invitation-issue-result"

const DIR = "src/app/(dashboard)/app/dev/real-invitation-issue"
const read = (file: string) => readFileSync(resolve(process.cwd(), DIR, file), "utf8")

const page = read("page.tsx")
const action = read("actions.ts")
const finder = read("find-smoke-target-person.ts")
const panel = read("real-invitation-issue-panel.tsx")

const UNSAFE = /TENANT_|SQLSTATE|PGRST|@|[0-9a-f]{8}-[0-9a-f]{4}|digest|token|https?:/i

// --- result mapping (pure) -------------------------------------------------

test("invitation_sent maps to a safe sent message", () => {
  const view = describeSmokeIssueResult({
    status: "invitation_sent",
    invitationId: "11111111-1111-4111-8111-111111111111",
    generation: 1,
    correlationId: "corr-1",
  })
  assert.equal(view.status, "sent")
  assert.match(view.message ?? "", /emitido e capturado/i)
  assert.doesNotMatch(view.message ?? "", UNSAFE)
})

const errorResults = [
  { status: "conflict", reason: "already_linked", message: "x" },
  { status: "conflict", reason: "pending_invitation", message: "x" },
  { status: "conflict", message: "x" },
  { status: "denied", message: "x" },
  { status: "invalid_input", message: "x" },
  { status: "session_expired" },
  { status: "no_membership" },
  { status: "tenant_selection_required" },
  { status: "invitation_created_delivery_failed", invitationId: "i", generation: 1, correlationId: "c" },
  { status: "configuration_error", correlationId: "c" },
  { status: "failed", message: "x" },
] as const

for (const result of errorResults) {
  const label = "reason" in result && result.reason ? `${result.status}/${result.reason}` : result.status
  test(`${label} maps to a safe error message without leaking codes/ids`, () => {
    const view = describeSmokeIssueResult(result as Parameters<typeof describeSmokeIssueResult>[0])
    assert.equal(view.status, "error")
    assert.ok((view.message ?? "").length > 0)
    assert.doesNotMatch(view.message ?? "", UNSAFE)
  })
}

// --- double gate + authorization ------------------------------------------

test("page and action both enforce the development + capture-flag double gate", () => {
  for (const source of [page, action]) {
    assert.match(source, /process\.env\.NODE_ENV === "development"/)
    assert.match(source, /process\.env\.DEV_INVITATION_CAPTURE_ENABLED === "true"/)
  }
  assert.match(page, /notFound\(\)/)
})

test("owner/admin is enforced server-side (finder) and re-checked, not trusted from the page", () => {
  assert.match(finder, /currentUser\.role !== "owner" && currentUser\.role !== "admin"/)
  assert.match(finder, /"unauthorized"/)
  assert.match(page, /target\.status === "unauthorized"/)
  assert.match(action, /target\.status === "unauthorized"/)
})

// --- target selection invariants ------------------------------------------

test("target is resolved server-side: tenant-scoped, fixed email, active, user_id NULL, exactly one", () => {
  assert.match(finder, /import "server-only"/)
  assert.match(finder, /SMOKE_TARGET_EMAIL = "galileu_ga@hotmail\.com"/)
  assert.match(finder, /getCurrentCompanyContext\(\)/)
  assert.match(finder, /\.eq\("company_id", companyId\)/)
  assert.match(finder, /\.eq\("status", "active"\)/)
  assert.match(finder, /\.is\("user_id", null\)/)
  assert.match(finder, /matches\.length === 0/) // zero -> not_prepared
  assert.match(finder, /matches\.length > 1/) // ambiguous
})

// --- no browser authority / no direct data or provider access -------------

test("action reuses the real Issue Action with a fixed role and no browser-supplied authority", () => {
  assert.match(action, /"use server"/)
  assert.match(
    action,
    /issueCompanyMemberInvitationAction\(\{\s*personId: target\.personId,\s*intendedRole: "employee",\s*\}\)/,
  )
  assert.match(action, /void _formData/)
  assert.doesNotMatch(action, /formData\.get/)
  assert.doesNotMatch(action, /companyId|targetEmail|actorUserId|tokenDigest|generation|idempotencyKey|correlationId/)
})

test("no direct invitation-table SELECT, no direct RPC, no service_role anywhere", () => {
  for (const source of [page, action, finder, panel]) {
    assert.doesNotMatch(source, /company_member_invitations/)
    assert.doesNotMatch(source, /\.rpc\(/)
    assert.doesNotMatch(source, /service_role/)
  }
})

// --- human submit, no auto-issue, no link exposure ------------------------

test("panel issues only on human submit, never on load, and never shows the link", () => {
  assert.match(panel, /"use client"/)
  assert.match(panel, /<form action=\{action\}/)
  assert.match(panel, /disabled=\{pending \|\| !eligible \|\| state\.status === "sent"\}/)
  assert.doesNotMatch(panel, /useEffect/)
  assert.doesNotMatch(panel, /invitationUrl|readInvitationCapture|\/invite\//)
})

test("this trigger does not create People and does not reveal the capture link", () => {
  for (const source of [page, action, finder]) {
    assert.doesNotMatch(source, /createEmployee|\.insert\(/)
    // No link exposure: the capture route may be referenced by name in help
    // text, but the link/token is never read or rendered here.
    assert.doesNotMatch(source, /readInvitationCapture|invitationUrl|\/invite\//)
  }
})

// keep unused import type referenced for lint clarity
const _typecheck: SmokeIssueState = { status: "idle", message: null }
void _typecheck
