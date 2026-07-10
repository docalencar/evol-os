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

  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)

  const companyId = memberships?.[0]?.company_id

  if (!companyId) {
    redirect("/onboarding")
  }

  return {
    supabase,
    user,
    companyId,
  }
}
