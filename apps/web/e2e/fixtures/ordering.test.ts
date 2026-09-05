/**
 * The fixture's creation order must match the schema, not an assumption.
 *
 * The sandbox has no Review connection, so the contract is proved statically from
 * the tracked migrations and the fixture is checked against it. That is stronger
 * than a comment: if a future migration changes the contract, these fail.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

import { resolveWebRoot } from "../helpers/paths"

const REPO_ROOT = resolve(resolveWebRoot(), "..", "..")
const migration = (name: string) =>
  readFileSync(resolve(REPO_ROOT, "supabase", "migrations", name), "utf8")

const M0001 = migration("0001_initial_schema.sql")
const M0071 = migration("0071_enforce_tenant_membership_invariants.sql")
const M0072 = migration("0072_complete_tenant_membership_invariants.sql")
const FIXTURE = readFileSync(
  resolve(resolveWebRoot(), "e2e", "fixtures", "tenant-fixture.ts"),
  "utf8",
)

test("people → company_members FK is immediate, so the membership must exist first", () => {
  const fk = M0071.slice(M0071.indexOf("people_company_user_membership_fkey"))
  assert.match(fk, /foreign key \(company_id, user_id\)/)
  assert.match(fk, /references public\.company_members\(company_id, user_id\)/)
  assert.match(fk, /deferrable initially immediate/)
  assert.match(fk, /on delete restrict/)
})

test("the active-membership trigger is deferred and only checks active rows", () => {
  assert.match(M0072, /create constraint trigger enforce_active_membership_has_people/)
  assert.match(M0072, /after insert or update on public\.company_members/)
  assert.match(M0072, /deferrable initially deferred/)
  assert.match(M0072, /if new\.status = 'active' and \(/)
})

test("'invited' is a documented membership status, not an invention", () => {
  assert.match(M0001, /status text not null default 'active' check \(status in \('active', 'inactive', 'invited'\)\)/)
})

test("the fixture inserts the membership as 'invited' before the person", () => {
  const pendingInsert = FIXTURE.indexOf('status: "invited"')
  const personInsert = FIXTURE.indexOf('.from("people")')
  const activate = FIXTURE.indexOf('.update({ status: "active" })')

  assert.ok(pendingInsert > -1, "membership must first be inserted as invited")
  assert.ok(personInsert > -1, "person insert must exist")
  assert.ok(activate > -1, "membership must then be activated")
  assert.ok(pendingInsert < personInsert, "invited membership must precede the person")
  assert.ok(personInsert < activate, "the person must precede activation")
})

test("the fixture never inserts a membership directly as active", () => {
  const insertBlock = FIXTURE.slice(
    FIXTURE.indexOf('from("company_members").insert'),
    FIXTURE.indexOf('.from("people")'),
  )
  assert.equal(insertBlock.includes('status: "active"'), false)
})

test("teardown deletes the company before auth users", () => {
  const destroy = FIXTURE.slice(FIXTURE.indexOf("export async function destroyRunFixtures"))
  const companyDelete = destroy.indexOf('from("companies").delete()')
  const userDelete = destroy.indexOf("deleteSyntheticUsers")
  assert.ok(companyDelete > -1 && userDelete > -1)
  assert.ok(
    companyDelete < userDelete,
    "deleting an auth user first cascades to company_members and collides with the " +
      "people→company_members ON DELETE RESTRICT foreign key, stranding the user",
  )
})

test("the fixture disables no constraint, trigger or RLS", () => {
  for (const forbidden of [
    /set constraints/i,
    /disable trigger/i,
    /alter table/i,
    /drop constraint/i,
    /row_security/i,
  ]) {
    assert.equal(forbidden.test(FIXTURE), false, `fixture must not use ${forbidden}`)
  }
})
