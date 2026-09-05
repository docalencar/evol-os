/**
 * Target identity — runs before every authenticated spec.
 *
 * Global setup already enforces these and refuses to build fixtures otherwise;
 * asserting them again here puts the proof in the test report, where release
 * evidence can point at it.
 */

import { expect, test } from "@playwright/test"

import { e2eEnv, REVIEW_CANONICAL_HOST, REVIEW_SUPABASE_REF } from "../helpers/env"
import { inspectTarget } from "../helpers/target-identity"

const env = e2eEnv()

test.describe("Review target identity", () => {
  test("base URL is the canonical Review alias", async () => {
    test.skip(env.allowNonReviewTarget, "non-Review target explicitly acknowledged")
    expect(env.baseHost).toBe(REVIEW_CANONICAL_HOST)
  })

  test("the deployment is bound to the Review Supabase project, and only to it", async () => {
    const identity = await inspectTarget()

    expect(identity.loginStatus).toBe(200)
    expect(identity.chunksScanned).toBeGreaterThan(0)

    test.skip(env.allowNonReviewTarget, "non-Review target explicitly acknowledged")

    expect(
      identity.refFoundInBundle,
      `expected Supabase ref ${REVIEW_SUPABASE_REF} in browser-delivered assets`,
    ).toBe(true)

    // Nothing else — not Production, not Legacy — may appear in client code.
    expect([...identity.supabaseHostsInBundle].sort()).toEqual([REVIEW_SUPABASE_REF])
  })

  test("no service-role-shaped string is served to the browser", async () => {
    const identity = await inspectTarget()
    expect(identity.serviceRoleShapedStringsInBundle).toBe(0)
  })

  test("the auth entrypoint renders and guards the app", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading", { name: /Entrar na Evol/i })).toBeVisible()

    await page.goto("/app")
    await expect(page).toHaveURL(/\/login(\?|$)/)
  })
})
