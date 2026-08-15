import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import test from "node:test"

const consumers = [
  "src/features/tenant-access/actions/issue-company-member-invitation-action.ts",
  "src/features/tenant-access/actions/resend-company-member-invitation-action.ts",
  "src/features/tenant-access/actions/revoke-company-member-invitation-action.ts",
  "src/features/activity/services/record-activity.ts",
  "src/features/notifications/application/load-notification-actor.ts",
] as const

test("every formerly inconsistent direct consumer uses the canonical preference-aware helper", () => {
  for (const consumer of consumers) {
    const source = readFileSync(resolve(process.cwd(), consumer), "utf8")
    assert.match(source, /loadPreferenceAwareCurrentUserContext\(/, consumer)
    assert.doesNotMatch(source, /loadCurrentUserContext\(/, consumer)
    assert.doesNotMatch(
      source,
      /readActiveTenantPreference|tenant_membership_preferences/,
      consumer,
    )
  }
})
