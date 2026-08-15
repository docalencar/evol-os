import "server-only"

import type { SupabaseClient, User } from "@supabase/supabase-js"

import {
  CurrentUserContextError,
  loadCurrentUserContext,
  type CurrentUserContext,
} from "@/features/authorization"
import { isTenantPreferenceResolutionEnabled } from "@/features/tenant-access/preferences/tenant-preference-flag"
import { readActiveTenantPreference } from "@/features/tenant-access/preferences/tenant-preference-repository"

export async function loadPreferenceAwareCurrentUserContext(
  supabase: SupabaseClient,
  authenticatedUser?: User,
): Promise<CurrentUserContext> {
  const user = authenticatedUser ?? (await supabase.auth.getUser()).data.user

  if (!user) {
    throw new CurrentUserContextError(
      "unauthenticated",
      "Usuário não autenticado.",
    )
  }

  let preferredCompanyId: string | null = null
  if (isTenantPreferenceResolutionEnabled()) {
    preferredCompanyId = (
      await readActiveTenantPreference(supabase, user.id)
    ).preferredCompanyId
  }

  return loadCurrentUserContext(supabase, user, preferredCompanyId)
}
