import { PageHeader } from "@/components/shared/page-header"
import {
  getPeopleAnalyticsDashboard,
  getSmartPeopleIndicators,
  PeopleAnalyticsDashboardWidget,
  presentPeopleAnalyticsDashboard,
  presentSmartPeopleIndicators,
  SmartPeopleIndicatorsWidget,
} from "@/features/analytics"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function AnalyticsPage() {
  const { companyId } = await getCurrentCompanyContext()

  try {
    const [dashboard, smartIndicators] = await Promise.all([
      getPeopleAnalyticsDashboard(companyId),
      getSmartPeopleIndicators(companyId),
    ])

    return (
      <div className="space-y-6">
        <PageHeader
          title="Analytics"
          description="Acompanhe os principais indicadores de pessoas e estrutura."
        />
        <section aria-labelledby="current-view-title">
          <h2
            id="current-view-title"
            className="mb-4 text-lg font-semibold text-slate-900"
          >
            Visão atual
          </h2>
          <PeopleAnalyticsDashboardWidget
            dashboard={presentPeopleAnalyticsDashboard(
              dashboard
            )}
          />
        </section>
        <SmartPeopleIndicatorsWidget
          dashboard={presentSmartPeopleIndicators(
            smartIndicators
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
