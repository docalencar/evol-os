import assert from "node:assert/strict"
import test from "node:test"

import { countOpenJobOpenings } from "./count-open-job-openings"
import type { JobOpeningStatus } from "../types/job-opening"

const opening = (status: JobOpeningStatus) => ({ status })

test("counts only openings in the 'open' status", () => {
  const jobOpenings = [
    opening("open"),
    opening("open"),
    opening("approved"),
    opening("draft"),
  ]

  assert.equal(countOpenJobOpenings(jobOpenings), 2)
})

test("an approved opening is NOT counted as open", () => {
  assert.equal(countOpenJobOpenings([opening("approved")]), 0)
})

test("non-open statuses are excluded", () => {
  const jobOpenings: Array<{ status: JobOpeningStatus }> = [
    opening("draft"),
    opening("pending_approval"),
    opening("approved"),
    opening("paused"),
    opening("closed"),
    opening("cancelled"),
    opening("filled"),
  ]

  assert.equal(countOpenJobOpenings(jobOpenings), 0)
})

test("an empty read model yields zero", () => {
  assert.equal(countOpenJobOpenings([]), 0)
})
