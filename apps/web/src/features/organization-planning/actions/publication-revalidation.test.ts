import assert from "node:assert/strict"
import test from "node:test"

import { getPublicationRevalidationPaths } from "./publication-revalidation"

test("publication revalidates the Dashboard, Timeline and scenario page", () => {
  assert.deepEqual(getPublicationRevalidationPaths("scenario-1"), [
    "/app/organization",
    "/app/organization/planning/timeline",
    "/app/organization/planning/scenario-1",
  ])
})
