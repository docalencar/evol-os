import assert from "node:assert/strict"
import test from "node:test"

import { isTenantPreferenceResolutionEnabled } from "./tenant-preference-flag"

function withFlag(value: string | undefined, run: () => void) {
  const env = process.env as Record<string, string | undefined>
  const previous = env.TENANT_PREFERENCE_RESOLUTION_ENABLED
  try {
    if (value === undefined) delete env.TENANT_PREFERENCE_RESOLUTION_ENABLED
    else env.TENANT_PREFERENCE_RESOLUTION_ENABLED = value
    run()
  } finally {
    if (previous === undefined) delete env.TENANT_PREFERENCE_RESOLUTION_ENABLED
    else env.TENANT_PREFERENCE_RESOLUTION_ENABLED = previous
  }
}

test("flag is ON only for the exact value \"true\"", () => {
  withFlag("true", () => assert.equal(isTenantPreferenceResolutionEnabled(), true))
})

test("flag is OFF for false, other values, or absent (safe default)", () => {
  withFlag("false", () => assert.equal(isTenantPreferenceResolutionEnabled(), false))
  withFlag("1", () => assert.equal(isTenantPreferenceResolutionEnabled(), false))
  withFlag("TRUE", () => assert.equal(isTenantPreferenceResolutionEnabled(), false))
  withFlag(undefined, () => assert.equal(isTenantPreferenceResolutionEnabled(), false))
})
