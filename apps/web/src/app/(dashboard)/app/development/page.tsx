import { PageHeader } from "@/components/shared/page-header"
import {
  DevelopmentPlanList,
  getDevelopmentPlans,
} from "@/features/development"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function DevelopmentPage() {
  const { companyId } = await getCurrentCompanyContext()

  const plans = await getDevelopmentPlans(companyId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Desenvolvimento"
        description="Crie e acompanhe planos de desenvolvimento individual orientados por competências."
      />

      <DevelopmentPlanList plans={plans ?? []} />
    </div>
  )
}
