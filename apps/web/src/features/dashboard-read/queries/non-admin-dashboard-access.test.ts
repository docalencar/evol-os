/**
 * The authenticated home must stay inside the reads its actor is entitled to.
 *
 * Hosted run 260910235625-3e0d24 performed the first non-administrative login
 * this suite has ever performed, and `/app` answered with Next's global
 * application error (digest 1226017092). The session was valid, the tenant
 * resolved, five of the six dashboard projections were permitted — and the
 * sixth, company-wide competency intelligence, comes from
 * `get_tenant_company_person_competency_expectations_v1` (0124), which serves
 * `owner`, `admin`, `hr` and raises `42501` for everyone else. Nothing caught
 * it, so an entire employee lost the shell to a boundary behaving correctly.
 *
 * These tests pin the shape of the fix and, just as importantly, the two things
 * it must NOT become: a widened boundary, or a `catch` that turns every failure
 * into an empty list.
 */

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { registerHooks } from "node:module"
import { resolve } from "node:path"
import test from "node:test"

import type { SupabaseClient } from "@supabase/supabase-js"

import { isAdministrativeRole } from "../../authorization/secure-administrative-read-service"

registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "server-only"
      ? { shortCircuit: true, url: "server-only:test" }
      : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    return url === "server-only:test"
      ? { format: "module", shortCircuit: true, source: "export {}" }
      : nextLoad(url, context)
  },
})

const repositoryModule = import("../repositories/tenant-dashboard-read-repository")
const queryModule = import("./get-app-dashboard-read-model")

const COMPANY = "11111111-1111-4111-8111-111111111111"
const ADMINISTRATIVE_RPC = "get_tenant_company_person_competency_expectations_v1"

function createDatabase(
  responseFor: (name: string) => Readonly<{ data: unknown; error: unknown }> = () => ({
    data: [],
    error: null,
  }),
) {
  const calls: string[] = []
  const database = {
    rpc(name: string, parameters: unknown) {
      void parameters
      calls.push(name)
      return Promise.resolve(responseFor(name))
    },
  } as unknown as SupabaseClient

  return { calls, database }
}

const EMPTY_MEMBER_ROWS = {
  organization: [],
  people: [],
  development: [],
  recruitment: [],
  activity: [],
} as const

test("the role authority is the one the backend already contracted", () => {
  // 0124 serves exactly owner, admin and hr. The application must not carry a
  // second, divergent list — this is the single helper both sides agree on.
  for (const role of ["owner", "admin", "hr"] as const) {
    assert.equal(isAdministrativeRole(role), true, `${role} must keep the intelligence`)
  }
  for (const role of ["manager", "employee"] as const) {
    assert.equal(isAdministrativeRole(role), false, `${role} must not ask for it`)
  }
})

test("an administrative actor still loads competency intelligence", async () => {
  const { createTenantDashboardReadRepository } = await repositoryModule
  const { calls, database } = createDatabase()

  const rows = await createTenantDashboardReadRepository(database).load(COMPANY, {
    competencyIntelligence: "authorized",
  })

  assert.ok(calls.includes(ADMINISTRATIVE_RPC), "the boundary must still be consulted")
  assert.equal(rows.competencyIntelligence.status, "ok")
})

test("a non-administrative actor never reaches the administrative boundary", async () => {
  const { createTenantDashboardReadRepository } = await repositoryModule
  const { calls, database } = createDatabase()

  const rows = await createTenantDashboardReadRepository(database).load(COMPANY, {
    competencyIntelligence: "forbidden",
  })

  // Not "asked and refused" — never asked. There is no 42501 to swallow.
  assert.equal(calls.includes(ADMINISTRATIVE_RPC), false)
  assert.equal(rows.competencyIntelligence.status, "forbidden")

  // Everything an active member IS entitled to still loads.
  assert.deepEqual(calls, [
    "get_tenant_organization_directory_v1",
    "get_tenant_people_directory_v1",
    "get_tenant_development_dashboard_v1",
    "get_tenant_recruitment_job_openings_v1",
    "get_tenant_activity_timeline_v1",
  ])
})

test("not authorized is not the same value as no data", async () => {
  const { presentAppDashboardReadModel } = await queryModule

  const forbidden = presentAppDashboardReadModel(COMPANY, {
    ...EMPTY_MEMBER_ROWS,
    competencyIntelligence: { status: "forbidden" },
  })
  const authorizedButEmpty = presentAppDashboardReadModel(COMPANY, {
    ...EMPTY_MEMBER_ROWS,
    competencyIntelligence: { status: "ok", coverages: [] },
  })

  assert.equal(forbidden.competencyDevelopment.status, "forbidden")
  assert.equal(authorizedButEmpty.competencyDevelopment.status, "ok")

  // The distinction has to survive into the model, or the card renders four
  // zeros at a manager and tells them the company has no competency gaps.
  assert.notDeepEqual(
    forbidden.competencyDevelopment,
    authorizedButEmpty.competencyDevelopment,
  )
  assert.equal("development" in forbidden.competencyDevelopment, false)
  assert.deepEqual(
    authorizedButEmpty.competencyDevelopment.status === "ok"
      ? authorizedButEmpty.competencyDevelopment.development.priorities
      : null,
    [],
  )
})

test("a real failure on a permitted read still fails", async () => {
  const { createTenantDashboardReadRepository, TenantDashboardReadError } =
    await repositoryModule

  const { database } = createDatabase((name) => ({
    data: [],
    error: name === "get_tenant_people_directory_v1" ? { code: "42501" } : null,
  }))

  await assert.rejects(
    createTenantDashboardReadRepository(database).load(COMPANY, {
      competencyIntelligence: "forbidden",
    }),
    (error: unknown) =>
      error instanceof TenantDashboardReadError && error.code === "read_failed",
    "narrowing the competency read must not make the other five forgiving",
  )
})

test("an unexpected failure of the administrative read is never swallowed", async () => {
  const { createTenantDashboardReadRepository } = await repositoryModule

  const { database } = createDatabase((name) => ({
    data: [],
    error: name === ADMINISTRATIVE_RPC ? { code: "42501" } : null,
  }))

  // The actor IS entitled to this read, so a refusal here means something is
  // genuinely wrong. It must surface, not degrade into an empty coverage list.
  await assert.rejects(
    createTenantDashboardReadRepository(database).load(COMPANY, {
      competencyIntelligence: "authorized",
    }),
    (error: unknown) => error instanceof Error && error.name.length > 0,
  )
})

/** Executable source: comments removed, because they discuss what they avoid. */
function executable(path: string): string {
  return readFileSync(resolve(process.cwd(), "src", path), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
    .join("\n")
}

test("both member-reachable surfaces decide from the session's own role", () => {
  for (const page of [
    "app/(dashboard)/app/page.tsx",
    "app/(dashboard)/app/development/page.tsx",
  ]) {
    const source = executable(page)
    assert.match(
      source,
      /isAdministrativeRole\(currentUser\.role\)/,
      `${page} must derive the capability from the resolved membership role`,
    )
    assert.match(
      source,
      /canReadCompetencyIntelligence/,
      `${page} must pass the capability to its read model`,
    )
  }
})

test("no read in the changed graph degrades a failure into empty data", () => {
  for (const path of [
    "features/dashboard-read/repositories/tenant-dashboard-read-repository.ts",
    "features/dashboard-read/queries/get-app-dashboard-read-model.ts",
    "features/development/services/get-development-executive-dashboard.ts",
  ]) {
    const source = executable(path)
    assert.doesNotMatch(
      source,
      /catch[\s\S]{0,80}return\s*(\[\]|Object\.freeze\(\[\]\))/,
      `${path} must not convert an error into an empty list`,
    )
  }
})
