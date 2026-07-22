import { PageHeader } from "@/components/shared/page-header"
import {
  getPeopleAnalyticsDashboard,
  PeopleAnalyticsDashboardWidget,
  presentPeopleAnalyticsDashboard,
} from "@/features/analytics"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function AnalyticsPage() {
  const { companyId } = await getCurrentCompanyContext()

  try {
    const dashboard = await getPeopleAnalyticsDashboard(
      companyId
    )

    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Acompanhe os principais indicadores de pessoas e estrutura."
        />
        <PeopleAnalyticsDashboardWidget
          dashboard={presentPeopleAnalyticsDashboard(
            dashboard
          )}
        />
      </div>
    )
  } catch (error) {
    console.error(
      "[people-analytics] dashboard load failed",
      error
    )

    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Acompanhe os principais indicadores de pessoas e estrutura."
        />
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
        >
          Não foi possível carregar os indicadores agora.
          Tente novamente em instantes.
        </div>
      </div>
    )
  }
}
