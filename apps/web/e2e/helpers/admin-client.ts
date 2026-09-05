/**
 * Privileged Supabase clients — RUNNER ONLY. NEVER IMPORTED BY `src/`.
 *
 * The service-role key is read from the runner environment and used only here, in
 * the Node process that Playwright's setup/teardown runs in. It is never passed to
 * a browser context, never injected via `page.evaluate`, never written to storage
 * state, and never included in a trace, screenshot or evidence file.
 *
 * There is deliberately no application route that performs this bootstrap: adding
 * one would be a permanent privileged backdoor in the deployed app.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { e2eEnv } from "./env"

/** Service-role client. Bypasses RLS. Setup and teardown only. */
export function adminClient(): SupabaseClient {
  const env = e2eEnv()
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { "x-evol-e2e": "bootstrap" } },
  })
}

/**
 * Anonymous client authenticated as a synthetic user. Used so tenant bootstrap can
 * go through the *real* trusted domain boundary (`create_company_with_owner`,
 * which requires `auth.uid()`) instead of writing tables directly.
 */
export async function userClient(email: string, password: string): Promise<SupabaseClient> {
  const env = e2eEnv()
  const client = createClient(env.supabaseUrl, env.anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) {
    // The message can echo input; it never contains the password, but redact anyway.
    throw new Error(`E2E_BOOTSTRAP_SIGNIN_FAILED for ${email}: ${error.message}`)
  }
  return client
}
