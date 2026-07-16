import {
  OrganizationSyncHistoryHome,
} from "@/features/organization/sync/server"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

export default async function OrganizationSyncHistoryPage() {
  const { companyId } =
    await getCurrentCompanyContext()

  return (
    <div className="space-y-6">
      <OrganizationSyncHistoryHome
        companyId={companyId}
      />
    </div>
  )
}
