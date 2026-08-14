import { notFound, redirect } from "next/navigation"

import { Card } from "@/components/ui/card"
import { loadTenantSelectionOptions } from "@/features/authorization/load-tenant-selection-options"
import { isTenantPreferenceResolutionEnabled } from "@/features/tenant-access/preferences/tenant-preference-flag"
import { createClient } from "@/lib/supabase/supabase/server"

// MVP-PR1 Phase 7 (PR 7D). Safe, auth-only tenant-selection boundary reached when
// a user has multiple active memberships and no valid preference (flag ON). It
// uses its own auth-only membership loader (not the shared company-context
// resolver) so it can never redirect back to itself, and it chooses no tenant
// implicitly. The interactive selector is deferred to Phase 9.
export default async function SelectCompanyPage() {
  if (!isTenantPreferenceResolutionEnabled()) {
    notFound()
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const result = await loadTenantSelectionOptions(supabase, user.id)
  if (result.status === "no_membership") {
    redirect("/onboarding")
  }
  if (result.status === "single") {
    redirect("/app")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-evol-surface px-4">
      <div className="w-full max-w-md">
        <Card className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              Selecione uma empresa
            </h1>
            <p className="text-sm text-slate-600">
              Você tem acesso a mais de uma empresa. Escolha uma para continuar.
            </p>
          </div>

          <ul className="space-y-2">
            {result.options.map((option) => (
              <li
                key={option.companyId}
                className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-900"
              >
                {option.companyName}
              </li>
            ))}
          </ul>

          <p className="text-xs text-slate-500">
            A seleção de empresa será habilitada em breve.
          </p>
        </Card>
      </div>
    </main>
  )
}
