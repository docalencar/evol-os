import assert from "node:assert/strict"
import test from "node:test"

import {
  createCompanyTurnoverRepository,
  type TurnoverRpc,
} from "./company-turnover-repository"

const rows = [
  {
    period_kind: "closed",
    period_start: "2026-08-01",
    period_end_exclusive: "2026-09-01",
    availability: "available",
    unavailable_reason: null,
    headcount_at_start: 100,
    headcount_at_end: 100,
    headcount_as_of: null,
    canonical_terminations: 2,
    turnover_percent: "2.5",
    coverage_started_at: "2026-08-01T00:00:00+00:00",
    generated_at: "2026-09-20T12:00:00+00:00",
    headcount_as_of_at: null,
  },
  {
    period_kind: "mtd",
    period_start: "2026-09-01",
    period_end_exclusive: "2026-10-01",
    availability: "available",
    unavailable_reason: null,
    headcount_at_start: 100,
    headcount_at_end: null,
    headcount_as_of: 98,
    canonical_terminations: 1,
    turnover_percent: "1.25",
    coverage_started_at: "2026-08-01T00:00:00+00:00",
    generated_at: "2026-09-20T12:00:00+00:00",
    headcount_as_of_at: "2026-09-20T11:59:00+00:00",
  },
] as const

test("reads company-total Turnover only through the trusted RPC and maps both canonical periods", async () => {
  const calls: unknown[][] = []
  const rpc: TurnoverRpc = async (...args) => {
    calls.push(args)
    return { data: rows, error: null }
  }

  const result = await createCompanyTurnoverRepository(rpc).findCompanyTotal(
    "5ca1ab1e-5f7a-47ee-a111-111111111111"
  )

  assert.deepEqual(calls, [[
    "get_company_turnover_v1",
    {
      p_company_id: "5ca1ab1e-5f7a-47ee-a111-111111111111",
      p_reason: "analytics_turnover_summary",
    },
  ]])
  assert.equal(result[0].periodKind, "closed")
  assert.equal(result[0].turnoverPercent, 2.5)
  assert.equal(result[1].periodKind, "mtd")
  assert.equal(result[1].turnoverPercent, 1.25)
})

test("rejects incomplete, duplicate or malformed boundary results instead of inventing facts", async () => {
  for (const data of [
    [],
    [rows[0]],
    [rows[0], rows[0]],
    [{ ...rows[0], turnover_percent: null }, rows[1], rows[0]],
  ]) {
    const rpc: TurnoverRpc = async () => ({ data, error: null })
    await assert.rejects(
      createCompanyTurnoverRepository(rpc).findCompanyTotal(
        "5ca1ab1e-5f7a-47ee-a111-111111111111"
      ),
      /TURNOVER_RESPONSE_INVALID/
    )
  }
})

test("fails closed when the trusted boundary fails", async () => {
  const rpc: TurnoverRpc = async () => ({ data: null, error: new Error("denied") })
  await assert.rejects(
    createCompanyTurnoverRepository(rpc).findCompanyTotal(
      "5ca1ab1e-5f7a-47ee-a111-111111111111"
    ),
    /TURNOVER_READ_FAILED/
  )
})
