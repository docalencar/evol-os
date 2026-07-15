import {
  CustomerActivationHome,
  presentCustomerActivation,
} from "@/features/customer-activation"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

export default async function DashboardHomePage() {
  const {
    companyId,
    companyName,
  } = await getCurrentCompanyContext()

  const activation = await presentCustomerActivation({
    companyId,
    companyName,
  })

  return (
    <CustomerActivationHome activation={activation} />
  )
}
