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
