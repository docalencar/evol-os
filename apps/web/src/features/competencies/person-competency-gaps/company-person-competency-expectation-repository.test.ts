import assert from "node:assert/strict"
import test from "node:test"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  CompanyPersonCompetencyExpectationReadError,
  createCompanyPersonCompetencyExpectationRepository,
} from "./repositories/company-person-competency-expectation-repository"

const companyId = "11111111-1111-4111-8111-111111111111"

function databaseReturning(data: unknown, error: unknown = null) {
  const calls: { name: string; parameters: unknown }[] = []
  const database = {
    rpc(name: string, parameters: unknown) {
      calls.push({ name, parameters })
      return Promise.resolve({ data, error })
    },
  } as unknown as SupabaseClient

  return { calls, database }
}

test("performs exactly one company-wide 0124 RPC call", async () => {
  const { calls, database } = databaseReturning([])
  const repository = createCompanyPersonCompetencyExpectationRepository(database)

  assert.deepEqual(await repository.findByCompany(companyId), [])
  assert.deepEqual(calls, [{
    name: "get_tenant_company_person_competency_expectations_v1",
    parameters: { p_company_id: companyId },
  }])
  assert.equal(
    calls.some((call) => call.name === "get_tenant_person_competency_expectations_v1"),
    false,
  )
})

test("strictly rejects malformed bulk rows and remote failures", async () => {
  const malformed = databaseReturning([{ person_id: "not-a-uuid" }])
  await assert.rejects(
    createCompanyPersonCompetencyExpectationRepository(malformed.database)
      .findByCompany(companyId),
    (error: unknown) =>
      error instanceof CompanyPersonCompetencyExpectationReadError
      && error.code === "invalid_response",
  )

  const failed = databaseReturning([], { code: "42501" })
  await assert.rejects(
    createCompanyPersonCompetencyExpectationRepository(failed.database)
      .findByCompany(companyId),
    (error: unknown) =>
      error instanceof CompanyPersonCompetencyExpectationReadError
      && error.code === "read_failed"
      && !error.message.includes("42501"),
  )
})
