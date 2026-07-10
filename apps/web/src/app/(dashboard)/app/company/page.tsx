import Link from "next/link"

import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DepartmentCreateDialog,
  DepartmentTable,
  getDepartments,
} from "@/features/organization/departments"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function CompanyPage() {
  const { companyId } = await getCurrentCompanyContext()

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