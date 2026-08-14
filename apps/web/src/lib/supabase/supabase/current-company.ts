import { redirect } from "next/navigation"

import {
  CurrentUserContextError,
  loadCurrentUserContext,
} from "@/features/authorization"
// Deep imports keep the tenant-access `server-only` preference read/flag out of
// the feature's public barrel and avoid an authorization <-> tenant-access cycle.
import { isTenantPreferenceResolutionEnabled } from "@/features/tenant-access/preferences/tenant-preference-flag"
import { readActiveTenantPreference } from "@/features/tenant-access/preferences/tenant-preference-repository"

import { createClient } from "./server"

export async function getCurrentCompanyContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // PR 7C: when the flag is ON, read the protected tenant preference and pass it
  // to the resolver as CONTEXT. It only selects among the user's active
  // memberships; the resolver ignores a stale/foreign/absent preference. With
  // the flag OFF (default), no read happens and behavior is unchanged.
  let preferredCompanyId: string | null = null
  if (isTenantPreferenceResolutionEnabled()) {
    preferredCompanyId = (await readActiveTenantPreference(supabase, user.id)).preferredCompanyId
  }

  let currentUser
  try {
    currentUser = await loadCurrentUserContext(supabase, user, preferredCompanyId)
  } catch (error) {
    if (
      error instanceof CurrentUserContextError &&
      error.code === "membership_not_found"
    ) {
      redirect("/onboarding")
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
