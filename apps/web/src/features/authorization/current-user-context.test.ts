import assert from "node:assert/strict"
import test from "node:test"

import type { SupabaseClient, User } from "@supabase/supabase-js"

import {
  CurrentUserContextError,
  loadCurrentUserContext,
} from "./current-user-context"

type MembershipRow = Readonly<{
  company_id: string
  role: string
  status: "active" | "inactive" | "invited"
}>

function createSupabase(rows: readonly MembershipRow[]): SupabaseClient {
  const query = {
    select: () => query,
    eq: () => query,
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: rows, error: null }).then(resolve),
  }

  return {
    from: () => query,
  } as unknown as SupabaseClient
}

const authenticatedUser = { id: "user-1" } as User

test("preserves the legacy single-tenant context", async () => {
  const context = await loadCurrentUserContext(
    createSupabase([
      { company_id: "company-a", role: "owner", status: "active" },
    ]),
    authenticatedUser
  )

  assert.deepEqual(context, {
    userId: "user-1",
    companyId: "company-a",
    role: "owner",
  })
})

test("fails closed when the user has no active membership", async () => {
  await assert.rejects(
    loadCurrentUserContext(createSupabase([]), authenticatedUser),
    (error) =>
      error instanceof CurrentUserContextError &&
      error.code === "membership_not_found"
  )
})

test("fails closed instead of choosing an arbitrary tenant", async () => {
  await assert.rejects(
    loadCurrentUserContext(
      createSupabase([
        { company_id: "company-a", role: "owner", status: "active" },
        { company_id: "company-b", role: "admin", status: "active" },
      ]),
      authenticatedUser
    ),
    (error) =>
      error instanceof CurrentUserContextError &&
      error.code === "tenant_selection_required"
  )
})

test("fails closed when an active membership has an invalid role", async () => {
  await assert.rejects(
    loadCurrentUserContext(
      createSupabase([
        { company_id: "company-a", role: "unknown", status: "active" },
      ]),
      authenticatedUser
    ),
    (error) =>
      error instanceof CurrentUserContextError && error.code === "invalid_role"
  )
})
