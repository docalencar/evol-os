import { notFound } from "next/navigation"

import { ExecutiveHome } from "@/features/executive"
import { requireExecutiveAccess } from "@/features/executive/access/executive-access"

import { getExecutiveHome } from "@/features/executive/queries/get-executive-home"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function ExecutivePage() {
  const { currentUser } = await getCurrentCompanyContext()

  requireExecutiveAccess(currentUser.role, notFound)

  const executive = await getExecutiveHome()

  return <ExecutiveHome data={executive} />
}
