import assert from "node:assert/strict"
import { registerHooks } from "node:module"
import test from "node:test"

import type { SupabaseClient } from "@supabase/supabase-js"

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

const repositoryModule = import("./tenant-dashboard-read-repository")

const expectedRpcs = [
  "get_tenant_organization_directory_v1",
  "get_tenant_people_directory_v1",
  "get_tenant_development_dashboard_v1",
  "get_tenant_competency_directory_v1",
  "get_tenant_recruitment_job_openings_v1",
  "get_tenant_activity_timeline_v1",
] as const

function createDatabase(
  responseFor: (name: string) => Readonly<{ data: unknown; error: unknown }>,
) {
  const calls: Readonly<{ name: string; parameters: unknown }>[] = []
  const database = {
    rpc(name: string, parameters: unknown) {
      calls.push({ name, parameters })
      return Promise.resolve(responseFor(name))
    },
  } as unknown as SupabaseClient

  return { calls, database }
}

test("loads all dashboard projections with server-supplied tenant scope", async () => {
  const { createTenantDashboardReadRepository } = await repositoryModule
  const { calls, database } = createDatabase(() => ({ data: [], error: null }))
  const repository = createTenantDashboardReadRepository(database)

  const result = await repository.load("11111111-1111-4111-8111-111111111111", 20)

  assert.deepEqual(Object.keys(result), [
    "organization", "people", "development", "competencies", "recruitment", "activity",
  ])
  assert.deepEqual(calls.map((call) => call.name), expectedRpcs)
  assert.deepEqual(calls[0].parameters, {
    p_company_id: "11111111-1111-4111-8111-111111111111",
  })
  assert.deepEqual(calls[5].parameters, {
    p_company_id: "11111111-1111-4111-8111-111111111111",
    p_limit: 20,
  })
})

test("accepts valid empty tenants and fails closed for malformed RPC rows", async () => {
  const { createTenantDashboardReadRepository, TenantDashboardReadError } =
    await repositoryModule
  const valid = createDatabase(() => ({ data: [], error: null }))
  await assert.doesNotReject(
    createTenantDashboardReadRepository(valid.database).load(
      "11111111-1111-4111-8111-111111111111",
    ),
  )

  const malformed = createDatabase((name) => ({
    data: name === "get_tenant_people_directory_v1" ? [{ person_id: "not-a-uuid" }] : [],
    error: null,
  }))

  await assert.rejects(
    createTenantDashboardReadRepository(malformed.database).load(
      "11111111-1111-4111-8111-111111111111",
    ),
    (error: unknown) =>
      error instanceof TenantDashboardReadError
      && error.code === "invalid_response"
      && error.message === "Não foi possível carregar o dashboard.",
  )
})

test("does not collapse authorization or PostgREST failures into empty data", async () => {
  const { createTenantDashboardReadRepository, TenantDashboardReadError } =
    await repositoryModule
  const { database } = createDatabase((name) => ({
    data: [],
    error: name === "get_tenant_people_directory_v1" ? { code: "42501" } : null,
  }))

  await assert.rejects(
    createTenantDashboardReadRepository(database).load(
      "11111111-1111-4111-8111-111111111111",
    ),
    (error: unknown) =>
      error instanceof TenantDashboardReadError
      && error.code === "read_failed"
      && !error.message.includes("42501"),
  )
})
