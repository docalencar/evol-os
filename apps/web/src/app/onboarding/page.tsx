import { redirect } from "next/navigation"
import {
  Building2,
  Sparkles,
} from "lucide-react"

import { CompanyOnboardingForm } from "@/features/auth"
import { createClient } from "@/lib/supabase/supabase/server"

export default async function OnboardingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const {
    data: membership,
    error: membershipError,
  } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle()

  if (membershipError) {
    throw new Error(
      "Não foi possível verificar o onboarding."
    )
  }

  if (membership) {
    redirect("/app")
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-evol-surface px-4 py-10">
      <section className="w-full max-w-3xl rounded-card bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-evol-blue/10 text-evol-blue">
            <Building2 className="h-6 w-6" />
          </div>

          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-evol-blue">
              <Sparkles className="h-4 w-4" />
              Primeiro acesso
            </div>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Configure sua empresa
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Crie o espaço da sua organização para
              começar a cadastrar pessoas, cargos,
              departamentos e times.
            </p>
          </div>
        </div>

        <CompanyOnboardingForm />
      </section>
    </main>
  )
}
