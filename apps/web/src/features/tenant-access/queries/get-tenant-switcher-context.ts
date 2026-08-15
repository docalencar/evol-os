import "server-only"

import { loadTenantSelectionOptions } from "@/features/authorization/load-tenant-selection-options"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export type TenantSwitcherContext = Readonly<{
  currentCompanyId: string
  currentCompanyName: string
  options: readonly Readonly<{
    companyId: string
    companyName: string
  }>[]
  canSwitch: boolean
}>

export async function getTenantSwitcherContext(): Promise<TenantSwitcherContext> {
  const current = await getCurrentCompanyContext()
  const selection = await loadTenantSelectionOptions(
    current.supabase,
    current.user.id,
  )

  const options = selection.status === "options" ? selection.options : []

  return {
    currentCompanyId: current.companyId,
    currentCompanyName: current.companyName,
    options,
    canSwitch: options.length > 1,
  }
}
