import { EmployeeProfileStats } from "@/features/people/profile/components/employee-profile-stats"
import {
  DashboardCard,
  DashboardSection,
  InfoCard,
  KeyValueList,
} from "@/components/dashboard"
import { redirect } from "next/navigation"

import { getEmployeeById } from "@/features/people"
import { EMPLOYEE_STATUS_LABELS } from "@/features/people/constants/employee-status"
import { EmployeeProfileHeader } from "@/features/people/profile/components/employee-profile-header"
import type { EmployeeStatus } from "@/features/people/types/employee"
import { createClient } from "@/lib/supabase/supabase/server"

type Relation = { name: string } | { name: string }[] | null

function getRelationName(relation?: Relation) {
  if (!relation) return "-"
  if (Array.isArray(relation)) return relation[0]?.name || "-"
  return relation.name || "-"
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

  const positionName = getRelationName(employee.positions)
  const teamName = getRelationName(employee.teams)

  return (
    <div className="space-y-8">
      <DashboardSection title="Perfil do colaborador">
        <EmployeeProfileHeader
          employee={employee}
          positionName={positionName}
          teamName={teamName}
        />
      </DashboardSection>
      <DashboardSection title="Resumo">
       <EmployeeProfileStats
          hireDate={employee.hire_date}
          teamName={teamName}
          positionName={positionName}
        />
        </DashboardSection> 


      <DashboardSection title="Informações principais">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard label="E-mail" value={employee.email || "-"} />
          <InfoCard label="Telefone" value={employee.phone || "-"} />
          <InfoCard label="DISC" value={employee.disc_profile || "-"} />
        </div>
      </DashboardSection>

      <div className="grid gap-4 md:grid-cols-2">
        <DashboardSection title="Dados organizacionais">
          <DashboardCard>
            <KeyValueList
              items={[
                { label: "Cargo", value: positionName },
                { label: "Time", value: teamName },
                {
                  label: "Data de admissão",
                  value: formatDate(employee.hire_date),
                },
                {
                  label: "Status",
                  value:
                    EMPLOYEE_STATUS_LABELS[
                      employee.status as EmployeeStatus
                    ],
                },
              ]}
            />
          </DashboardCard>
        </DashboardSection>

        <DashboardSection title="Próximos módulos">
          <DashboardCard>
            <div className="space-y-3 text-sm text-slate-600">
              <p>⏳ Competências serão adicionadas em breve.</p>
              <p>⏳ Avaliações serão adicionadas em breve.</p>
              <p>⏳ Feedbacks serão adicionados em breve.</p>
              <p>⏳ PDI será adicionado em breve.</p>
            </div>
          </DashboardCard>
        </DashboardSection>
      </div>
    </div>
  )
}
