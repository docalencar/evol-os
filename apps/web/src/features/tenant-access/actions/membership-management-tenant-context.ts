import "server-only"

import { CurrentUserContextError } from "@/features/authorization"
import { loadPreferenceAwareCurrentUserContext } from "@/lib/supabase/supabase/preference-aware-current-user-context"
import { createClient } from "@/lib/supabase/supabase/server"

import type { MembershipManagementTenantContextResult } from "../orchestration/manage-company-membership"

export async function loadMembershipManagementTenantContext(): Promise<MembershipManagementTenantContextResult> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { status: "session_expired" }

  try {
    const currentUser = await loadPreferenceAwareCurrentUserContext(supabase, user)
    return {
      status: "resolved",
      companyId: currentUser.companyId,
      actorRole: currentUser.role,
    }
  } catch (caught) {
    if (caught instanceof CurrentUserContextError) {
      if (caught.code === "tenant_selection_required") return { status: "tenant_selection_required" }
      if (caught.code === "unauthenticated") return { status: "session_expired" }
      if (caught.code === "membership_not_found") return { status: "no_membership" }
    }
    throw caught
  }
}
