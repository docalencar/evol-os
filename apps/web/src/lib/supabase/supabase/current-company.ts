import { redirect } from "next/navigation"

import { createClient } from "./server"

export async function getCurrentCompanyContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    throw new Error(
      "Não foi possível identificar a empresa do usuário."
    )
  }

  const companyId = membership?.company_id

  if (!companyId) {
    redirect("/onboarding")
  }

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
    person,
    personId: person?.id ?? null,
  }
}
