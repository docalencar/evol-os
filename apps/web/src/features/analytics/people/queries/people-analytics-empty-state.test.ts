import assert from "node:assert/strict"
import test from "node:test"

import { calculateHeadcount } from "../services/calculate-headcount"
import { calculateOpenJobs } from "../services/calculate-open-jobs"
import { calculatePendingApprovals } from "../services/calculate-pending-approvals"
import { calculateOrganizationOccupancy } from "../services/calculate-organization-occupancy"
import { presentPeopleAnalyticsDashboard } from "../presenters/present-people-analytics-dashboard"

test("empty inputs produce a valid zero dashboard, not an error", () => {
  assert.equal(calculateHeadcount([]), 0)
  assert.equal(calculateOpenJobs([]), 0)
  assert.equal(calculatePendingApprovals([]), 0)

  const occupancy = calculateOrganizationOccupancy([])
  assert.deepEqual(occupancy, {
    current: 0,
    ideal: 0,
    difference: 0,
    percentage: null,
  })
})

test("presenter renders empty data as coherent zeros and an explicit unavailable occupancy", () => {
  const viewModel = presentPeopleAnalyticsDashboard({
    headcount: 0,
    openJobs: 0,
    pendingApprovals: 0,
    organizationOccupancy: calculateOrganizationOccupancy([]),
  })

  assert.equal(viewModel.headcount, "0")
  assert.equal(viewModel.openJobs, "0")
  assert.equal(viewModel.pendingApprovals, "0")
  assert.equal(viewModel.organizationOccupancy.percentage, "Indisponível")
  assert.equal(viewModel.organizationOccupancy.isAvailable, false)
  assert.equal(viewModel.isEmpty, true)
})

test("populated occupancy computes a real percentage", () => {
  const occupancy = calculateOrganizationOccupancy([
    { currentHeadcount: 2, targetHeadcount: 5 },
    { currentHeadcount: 1, targetHeadcount: 3 },
  ])
  assert.equal(occupancy.current, 3)
  assert.equal(occupancy.ideal, 8)
  assert.equal(occupancy.difference, 5)
  assert.equal(occupancy.percentage, (3 / 8) * 100)
})
