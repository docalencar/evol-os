import { redirect } from "next/navigation"

import { PageHeader } from "@/components/shared/page-header"
import {
  getTeams,
  TeamCreateDialog,
  TeamTable,
} from "@/features/organization/teams"
import { createClient } from "@/lib/supabase/supabase/server"

export default async function TeamsPage() {
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

  const teams = await getTeams(companyId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Times"
        description="Organize os times da empresa."
        actions={<TeamCreateDialog companyId={companyId} />}
      />

      <TeamTable teams={teams ?? []} />
    </div>
  )
}
