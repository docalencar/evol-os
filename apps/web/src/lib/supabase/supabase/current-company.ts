import { redirect } from "next/navigation"

import {
  CurrentUserContextError,
  loadCurrentUserContext,
} from "@/features/authorization"

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
    currentUser = await loadCurrentUserContext(supabase, user)
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
    .limit(1)
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
