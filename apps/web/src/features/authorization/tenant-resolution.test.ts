import assert from "node:assert/strict"
import test from "node:test"

import { resolveActiveTenantMemberships } from "./tenant-resolution"

test("returns no_membership when there are no active memberships", () => {
  assert.deepEqual(resolveActiveTenantMemberships([]), {
    status: "no_membership",
  })
})

test("resolves the only active membership", () => {
  assert.deepEqual(
    resolveActiveTenantMemberships([
      { companyId: "company-a", role: "employee", status: "active" },
    ]),
    {
      status: "resolved",
      companyId: "company-a",
      membership: { companyId: "company-a", role: "employee" },
    }
  )
})

test("requires explicit selection for multiple active memberships", () => {
  assert.deepEqual(
    resolveActiveTenantMemberships([
      { companyId: "company-b", role: "admin", status: "active" },
      { companyId: "company-a", role: "owner", status: "active" },
    ]),
    {
      status: "tenant_selection_required",
      memberships: [
        { companyId: "company-a", role: "owner" },
        { companyId: "company-b", role: "admin" },
      ],
    }
  )
})

test("multiple membership resolution is independent of query order", () => {
  const memberships = [
    { companyId: "company-a", role: "owner" as const, status: "active" as const },
    { companyId: "company-b", role: "admin" as const, status: "active" as const },
  ]

  assert.deepEqual(
    resolveActiveTenantMemberships(memberships),
    resolveActiveTenantMemberships([...memberships].reverse())
  )
})

test("inactive and invited memberships do not count", () => {
  assert.deepEqual(
    resolveActiveTenantMemberships([
      { companyId: "company-a", role: "employee", status: "inactive" },
      { companyId: "company-b", role: "employee", status: "invited" },
    ]),
    { status: "no_membership" }
  )
})

test("one active membership resolves when inactive memberships also exist", () => {
  assert.deepEqual(
    resolveActiveTenantMemberships([
      { companyId: "company-a", role: "owner", status: "active" },
      { companyId: "company-b", role: "employee", status: "inactive" },
      { companyId: "company-c", role: "employee", status: "invited" },
    ]),
    {
      status: "resolved",
      companyId: "company-a",
      membership: { companyId: "company-a", role: "owner" },
    }
  )
})

test("multiple active memberships require selection when inactive rows also exist", () => {
  const result = resolveActiveTenantMemberships([
    { companyId: "company-a", role: "owner", status: "active" },
    { companyId: "company-b", role: "admin", status: "active" },
    { companyId: "company-c", role: "employee", status: "inactive" },
  ])

  assert.equal(result.status, "tenant_selection_required")
})

// --- Phase 7 PR 7A: preference-aware resolution -----------------------------

const twoActive = [
  { companyId: "company-a", role: "owner" as const, status: "active" as const },
  { companyId: "company-b", role: "admin" as const, status: "active" as const },
]

test("single active membership always resolves, even with a matching preference", () => {
  assert.deepEqual(
    resolveActiveTenantMemberships(
      [{ companyId: "company-a", role: "employee", status: "active" }],
      "company-a",
    ),
    { status: "resolved", companyId: "company-a", membership: { companyId: "company-a", role: "employee" } },
  )
})

test("single active membership ignores a different preference and still resolves", () => {
  assert.deepEqual(
    resolveActiveTenantMemberships(
      [{ companyId: "company-a", role: "employee", status: "active" }],
      "company-z",
    ),
    { status: "resolved", companyId: "company-a", membership: { companyId: "company-a", role: "employee" } },
  )
})

test("multiple memberships with an absent preference require selection", () => {
  assert.equal(resolveActiveTenantMemberships(twoActive).status, "tenant_selection_required")
})

test("multiple memberships with a null preference require selection", () => {
  assert.equal(resolveActiveTenantMemberships(twoActive, null).status, "tenant_selection_required")
})

test("multiple memberships with an empty-string preference require selection", () => {
  assert.equal(resolveActiveTenantMemberships(twoActive, "   ").status, "tenant_selection_required")
})

test("a valid preference resolves the matching membership (first)", () => {
  assert.deepEqual(resolveActiveTenantMemberships(twoActive, "company-a"), {
    status: "resolved",
    companyId: "company-a",
    membership: { companyId: "company-a", role: "owner" },
  })
})

test("a valid preference resolves the matching membership (second)", () => {
  assert.deepEqual(resolveActiveTenantMemberships(twoActive, "company-b"), {
    status: "resolved",
    companyId: "company-b",
    membership: { companyId: "company-b", role: "admin" },
  })
})

test("a valid preference resolves the same membership regardless of input order", () => {
  assert.deepEqual(
    resolveActiveTenantMemberships(twoActive, "company-b"),
    resolveActiveTenantMemberships([...twoActive].reverse(), "company-b"),
  )
})

test("a preference for a foreign tenant (no membership) requires selection", () => {
  assert.equal(resolveActiveTenantMemberships(twoActive, "company-foreign").status, "tenant_selection_required")
})

test("a preference for an inactive membership is rejected and requires selection", () => {
  const result = resolveActiveTenantMemberships(
    [
      { companyId: "company-a", role: "owner", status: "active" },
      { companyId: "company-b", role: "admin", status: "active" },
      { companyId: "company-c", role: "employee", status: "inactive" },
    ],
    "company-c",
  )
  assert.equal(result.status, "tenant_selection_required")
})

test("no active membership yields no_membership even with a preference", () => {
  assert.deepEqual(
    resolveActiveTenantMemberships(
      [{ companyId: "company-a", role: "employee", status: "inactive" }],
      "company-a",
    ),
    { status: "no_membership" },
  )
})

test("parity: multiple memberships without a preference match the pre-7A behavior", () => {
  assert.deepEqual(
    resolveActiveTenantMemberships(twoActive),
    resolveActiveTenantMemberships(twoActive, undefined),
  )
})

test("no first-row fallback: multiple + unknown preference never auto-picks one", () => {
  const result = resolveActiveTenantMemberships(twoActive, "company-unknown")
  assert.equal(result.status, "tenant_selection_required")
  assert.equal("companyId" in result, false)
})

test("preference never alters the role returned for the resolved membership", () => {
  const result = resolveActiveTenantMemberships(twoActive, "company-b")
  assert.equal(result.status === "resolved" && result.membership.role, "admin")
})
