import { redirect } from "next/navigation"

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
      <section className="w-full max-w-lg rounded-card bg-white p-8 shadow-sm">
        <p className="text-sm font-medium text-evol-blue">
          Primeiro acesso
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          Configure sua empresa
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Crie o espaço da sua organização para começar a cadastrar pessoas, cargos e departamentos.
        </p>

        <CompanyOnboardingForm />
      </section>
    </main>
  )
}
