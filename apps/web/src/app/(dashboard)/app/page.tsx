import { CustomerActivationHome } from "@/features/customer-activation"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function DashboardHomePage() {
  const { companyName } = await getCurrentCompanyContext()

  return (
    <CustomerActivationHome companyName={companyName} />
  )
}
