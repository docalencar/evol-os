import assert from "node:assert/strict"
import test from "node:test"

import type { SupabaseClient } from "@supabase/supabase-js"

import {
  CompanyAssessmentSummaryReadError,
  createCompanyAssessmentSummaryRepository,
} from "./company-assessment-summary-repository"

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

test("reads all company assessment summaries with one E-DB1 call", async () => {
  const { calls, database } = databaseReturning([{
    employee_id: "22222222-2222-4222-8222-222222222222",
    completed_assessments: 2,
    pending_assessments: 1,
    latest_completed_at: "2026-09-20T10:00:00.000Z",
  }])

  const result = await createCompanyAssessmentSummaryRepository(database)
    .findByCompany(companyId)

  assert.equal(result[0]?.completedAssessments, 2)
  assert.deepEqual(calls, [{
    name: "get_company_assessment_summary_v1",
    parameters: {
      p_company_id: companyId,
      p_reason: "employee_intelligence_list",
    },
  }])
})

test("remote and malformed reads fail closed without false zeros", async () => {
  const failed = databaseReturning([], { code: "42501" })
  await assert.rejects(
    createCompanyAssessmentSummaryRepository(failed.database)
      .findByCompany(companyId),
    (error: unknown) =>
      error instanceof CompanyAssessmentSummaryReadError
      && error.code === "read_failed"
      && !error.message.includes("42501")
  )

  const malformed = databaseReturning([{ employee_id: "not-a-uuid" }])
  await assert.rejects(
    createCompanyAssessmentSummaryRepository(malformed.database)
      .findByCompany(companyId),
    (error: unknown) =>
      error instanceof CompanyAssessmentSummaryReadError
      && error.code === "invalid_response"
  )
})
