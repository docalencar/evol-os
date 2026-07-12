import { PageHeader } from "@/components/shared/page-header"

import {
  DevelopmentPlanTable,
  getDevelopmentPlanListItems,
} from "@/features/development"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

export default async function DevelopmentPage() {
  const { companyId } =
    await getCurrentCompanyContext()

  const {
    plans,
    owners,
  } =
    await getDevelopmentPlanListItems(
      companyId
    )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planos de Desenvolvimento Individual"
        description="Acompanhe todos os PDIs da empresa."
      />

      <DevelopmentPlanTable
        plans={plans}
        owners={owners}
      />
    </div>
  )
}
