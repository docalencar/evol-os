import Link from "next/link"
import { redirect } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"

import {
  DepartmentCreateDialog,
  DepartmentTable,
  getDepartments,
} from "@/features/organization/departments"

import { createClient } from "@/lib/supabase/supabase/server"

export default async function CompanyPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: memberships } = await supabase
    .from("company_members")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)

  const companyId = memberships?.[0]?.company_id

  if (!companyId) {
    redirect("/onboarding")
  }

  const departments = await getDepartments(companyId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organização"
        description="Gerencie a estrutura organizacional da empresa."
        actions={<DepartmentCreateDialog companyId={companyId} />}
      />

      <DepartmentTable departments={departments ?? []} />

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Cargos</h3>

            <p className="mt-2 text-sm text-slate-600">
              Defina os cargos utilizados pelos colaboradores.
            </p>
          </div>

          <Link href="/app/company/positions">
            <Button variant="secondary">Gerenciar cargos</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}

