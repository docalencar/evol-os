import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"

import { loadCurrentUserActiveTenants } from "@/features/authorization/server"

export type OnboardingAccessState = "setup_required" | "membership_exists"

export async function getOnboardingAccessState(
  supabase: SupabaseClient,
): Promise<OnboardingAccessState> {
  const activeTenants = await loadCurrentUserActiveTenants(supabase)
  return activeTenants.length === 0 ? "setup_required" : "membership_exists"
}
