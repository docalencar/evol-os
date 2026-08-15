import { redirect } from "next/navigation"

import {
  CurrentUserContextError,
} from "@/features/authorization"
import { isTenantPreferenceResolutionEnabled } from "@/features/tenant-access/preferences/tenant-preference-flag"

import { loadPreferenceAwareCurrentUserContext } from "./preference-aware-current-user-context"
import { createClient } from "./server"

export async function getCurrentCompanyContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  let currentUser
  try {
    currentUser = await loadPreferenceAwareCurrentUserContext(supabase, user)
  } catch (error) {
    if (error instanceof CurrentUserContextError) {
      if (error.code === "membership_not_found") {
        redirect("/onboarding")
      }
      // PR 7D: with preference resolution ON, a user with multiple active
      // memberships and no valid preference is routed to an explicit, safe
      // selection state instead of erroring. No tenant is chosen implicitly.
      // With the flag OFF this falls through to the pre-7C behavior (rethrow).
      if (
        error.code === "tenant_selection_required" &&
        isTenantPreferenceResolutionEnabled()
      ) {
        redirect("/select-company")
      }
    }
    throw error
  }

  const companyId = currentUser.companyId

  const {
    data: company,
    error: companyError,
  } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", companyId)
    .maybeSingle()

  if (companyError) {
    throw new Error(
      "Não foi possível carregar os dados da empresa."
    )
  }

  if (!company) {
    redirect("/onboarding")
  }

  const {
    data: person,
    error: personError,
  } = await supabase
    .from("people")
    .select("*")
    .eq("company_id", company.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (personError) {
    throw new Error(
      "Não foi possível identificar a pessoa vinculada ao usuário."
    )
  }

  return {
    supabase,
    user,
    companyId: company.id,
    companyName: company.name,
    currentUser,
    person,
    personId: person?.id ?? null,
  }
}
