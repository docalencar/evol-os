// MVP-PR1 Phase 7 (PR 7C). Server-side feature flag gating whether the persisted
// tenant preference participates in tenant resolution. Default OFF: only the
// exact value "true" enables it; absent or any other value is off. This is NOT a
// NEXT_PUBLIC flag and is never trusted from the browser — it merely toggles a
// server-side read; authority always remains the user's active memberships.
export function isTenantPreferenceResolutionEnabled(): boolean {
  return process.env.TENANT_PREFERENCE_RESOLUTION_ENABLED === "true"
}
