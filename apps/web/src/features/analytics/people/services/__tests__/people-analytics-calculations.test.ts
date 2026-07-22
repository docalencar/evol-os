import assert from "node:assert/strict"
import test from "node:test"

import { calculateHeadcount } from "../calculate-headcount"
import { calculateOpenJobs } from "../calculate-open-jobs"
import { calculateOrganizationOccupancy } from "../calculate-organization-occupancy"
import { calculatePendingApprovals } from "../calculate-pending-approvals"

test("calcula headcount contando somente pessoas ativas", () => {
  assert.equal(
    calculateHeadcount([
      { status: "active" },
      { status: "inactive" },
      { status: "terminated" },
      { status: "active" },
    ]),
    2
  )
  assert.equal(calculateHeadcount([]), 0)
})

test("conta somente vagas abertas", () => {
  assert.equal(
    calculateOpenJobs([
      { status: "open" },
      { status: "paused" },
      { status: "closed" },
    ]),
    1
  )
  assert.equal(calculateOpenJobs([]), 0)
})

test("conta somente solicitações pendentes", () => {
  assert.equal(
    calculatePendingApprovals([
      { status: "pending" },
      { status: "approved" },
      { status: "rejected" },
    ]),
    1
  )
  assert.equal(calculatePendingApprovals([]), 0)
})

test("trata quadro ideal zero como ocupação indisponível", () => {
  assert.deepEqual(
    calculateOrganizationOccupancy([]),
    {
      current: 0,
      ideal: 0,
      difference: 0,
      percentage: null,
    }
  )
})

test("calcula ocupação abaixo, igual e acima de 100%", () => {
  assert.equal(
    calculateOrganizationOccupancy([
      { currentHeadcount: 8, targetHeadcount: 10 },
    ]).percentage,
    80
  )
  assert.equal(
    calculateOrganizationOccupancy([
      { currentHeadcount: 10, targetHeadcount: 10 },
    ]).percentage,
    100
  )
  assert.equal(
    calculateOrganizationOccupancy([
      { currentHeadcount: 12, targetHeadcount: 10 },
    ]).percentage,
    120
  )
})

test("consolida quadros e calcula diferença absoluta", () => {
  assert.deepEqual(
    calculateOrganizationOccupancy([
      { currentHeadcount: 3, targetHeadcount: 5 },
      { currentHeadcount: 2, targetHeadcount: 3 },
    ]),
    {
      current: 5,
      ideal: 8,
      difference: 3,
      percentage: 62.5,
    }
  )
})
