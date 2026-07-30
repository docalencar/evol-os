import { getExecutiveKPIDashboard, KPIDashboardPage } from "@/features/kpi-dashboard"

export default async function ExecutivePage() {
  const dashboard = await getExecutiveKPIDashboard()
  return <KPIDashboardPage dashboard={dashboard} />
}
