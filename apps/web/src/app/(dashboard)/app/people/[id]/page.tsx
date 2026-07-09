import Link from "next/link"
import { redirect } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { EMPLOYEE_STATUS_LABELS } from "@/features/people/constants/employee-status"
import { getEmployeeById } from "@/features/people"
import type { EmployeeStatus } from "@/features/people/types/employee"
import { createClient } from "@/lib/supabase/supabase/server"

type Relation = { name: string } | { name: string }[] | null

function getRelationName(relation?: Relation) {
  if (!relation) return "-"
  if (Array.isArray(relation)) return relation[0]?.name || "-"
  return relation.name || "-"
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function formatDate(date?: string | null) {
  if (!date) return "-"

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(date))
}

type EmployeeProfilePageProps = {
  params: Promise<{ id: string }>
}

export default async function EmployeeProfilePage({
  params,
}: EmployeeProfilePageProps) {
  const { id } = await params
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
    .eq("status", "active")
    .limit(1)

  const companyId = memberships?.[0]?.company_id

  if (!companyId) {
    redirect("/onboarding")
  }

  const employee = await getEmployeeById(companyId, id)

  if (!employee) {
    redirect("/app/people")
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/people">
          <Button variant="secondary">Voltar para pessoas</Button>
        </Link>
      </div>

      <Card>
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 text-2xl font-bold text-white">
              {getInitials(employee.full_name)}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900">
                  {employee.full_name}
                </h1>

                <Badge>
                  {EMPLOYEE_STATUS_LABELS[employee.status as EmployeeStatus]}
                </Badge>
              </div>

              <p className="mt-2 text-slate-600">
                {getRelationName(employee.positions)} ·{" "}
                {getRelationName(employee.teams)}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Admitido em {formatDate(employee.hire_date)}
              </p>
            </div>
          </div>

          <Button variant="secondary">Editar perfil</Button>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">E-mail</p>
          <p className="mt-2 font-semibold text-slate-900">
            {employee.email || "-"}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">Telefone</p>
          <p className="mt-2 font-semibold text-slate-900">
            {employee.phone || "-"}
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">DISC</p>
          <p className="mt-2 font-semibold text-slate-900">
            {employee.disc_profile || "-"}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">
            Dados organizacionais
          </h2>

          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Cargo</span>
              <span className="font-medium text-slate-900">
                {getRelationName(employee.positions)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Time</span>
              <span className="font-medium text-slate-900">
                {getRelationName(employee.teams)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Data de admissão</span>
              <span className="font-medium text-slate-900">
                {formatDate(employee.hire_date)}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-slate-500">Status</span>
              <span className="font-medium text-slate-900">
                {EMPLOYEE_STATUS_LABELS[employee.status as EmployeeStatus]}
              </span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-slate-900">
            Próximos módulos
          </h2>

          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <p>⏳ Competências serão adicionadas em breve.</p>
            <p>⏳ Avaliações serão adicionadas em breve.</p>
            <p>⏳ Feedbacks serão adicionados em breve.</p>
            <p>⏳ PDI será adicionado em breve.</p>
          </div>
        </Card>
      </div>
    </div>
  )
}
