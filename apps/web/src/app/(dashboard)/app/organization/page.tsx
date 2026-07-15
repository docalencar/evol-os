import {
  getOrganizationOverview,
  OrganizationOverviewHome,
  OrganizationStructure,
  getOrganizationStructure,
  presentOrganizationOverview,
} from "@/features/organization-intelligence"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function OrganizationPage() {
  const { companyId } =
    await getCurrentCompanyContext()

  const overview =
    await getOrganizationOverview(companyId)

  const structure =
    await getOrganizationStructure(companyId)

  const viewModel =
    presentOrganizationOverview(overview)

  return (
    <div className="space-y-10">
      <OrganizationOverviewHome
        viewModel={viewModel}
      />

      <OrganizationStructure
        structure={structure}
      />
    </div>
  )
}
