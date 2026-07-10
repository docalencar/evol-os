import { redirect } from "next/navigation"

import {
  DashboardCard,
  DashboardSection,
  InfoCard,
} from "@/components/dashboard"
import {
  EmployeeCompetenciesCard,
  getEmployeeCompetenciesByEmployee,
} from "@/features/competencies/employee-competencies"
import { getPositions } from "@/features/organization/positions"
import { getTeams } from "@/features/organization/teams"
import {
  EMPLOYEE_STATUS_LABELS,
  getEmployeeById,
  getEmployees,
  type EmployeeStatus,
} from "@/features/people"
import { EmployeeProfileHeader } from "@/features/people/profile/components/employee-profile-header"
import { EmployeeProfileLayout } from "@/features/people/profile/components/employee-profile-layout"
import { EmployeeProfileSidebar } from "@/features/people/profile/components/employee-profile-sidebar"
import { EmployeeProfileTimeline } from "@/features/people/profile/components/employee-profile-timeline"
import {
  CompetencyGapCard,
  createEmployeeInsights,
  getEmployeeCompetencyGaps,
  TalentSummaryCard,
} from "@/features/talent"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type Relation = { name: string } | { name: string }[] | null

function getRelationName(relation?: Relation) {
  if (!relation) {
    return "-"
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name || "-"
  }

  return relation.name || "-"
}

function formatPhone(phone?: string | null) {
  if (!phone) {
    return "-"
  }

  const digits = phone.replace(/\D/g, "")

  if (digits.length === 11) {
    return digits.replace(
      /^(\d{2})(\d{5})(\d{4})$/,
      "($1) $2-$3"
    )
  }

  if (digits.length === 10) {
    return digits.replace(
      /^(\d{2})(\d{4})(\d{4})$/,
      "($1) $2-$3"
    )
  }

  return phone
}

type EmployeeProfilePageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function EmployeeProfilePage({
  params,
}: EmployeeProfilePageProps) {
  const { id } = await params
  const { companyId } = await getCurrentCompanyContext()

  const [
    employee,
    employeeCompetencies,
    competencyGaps,
    teams,
    positions,
    employees,
  ] = await Promise.all([
    getEmployeeById(companyId, id),
    getEmployeeCompetenciesByEmployee(companyId, id),
    getEmployeeCompetencyGaps(companyId, id),
    getTeams(companyId),
    getPositions(companyId),
    getEmployees(companyId),
  ])

  if (!employee) {
    redirect("/app/people")
  }

  const positionName = getRelationName(employee.positions)
  const teamName = getRelationName(employee.teams)

  const statusLabel =
    EMPLOYEE_STATUS_LABELS[employee.status as EmployeeStatus]

  const teamOptions = (teams ?? []).map((team) => ({
    id: team.id,
    name: team.name,
  }))

  const positionOptions = (positions ?? []).map((position) => ({
    id: position.id,
    name: position.name,
  }))

  const managerOptions = (employees ?? [])
    .filter((manager) => manager.id !== employee.id)
    .map((manager) => ({
      id: manager.id,
      name: manager.full_name,
    }))

  const currentManager = managerOptions.find(
    (manager) => manager.id === employee.manager_id
  )

  const managerName = currentManager?.name ?? "-"
  const insights = createEmployeeInsights(competencyGaps)

  return (
    <EmployeeProfileLayout
      sidebar={
        <EmployeeProfileSidebar
          positionName={positionName}
          teamName={teamName}
          managerName={managerName}
          status={statusLabel}
          hireDate={employee.hire_date ?? ""}
        />
      }
      header={
        <EmployeeProfileHeader
          companyId={companyId}
          employee={employee}
          positionName={positionName}
          teamName={teamName}
          teams={teamOptions}
          positions={positionOptions}
          managers={managerOptions}
        />
      }
    >
      <DashboardSection title="Resumo de talentos">
        <TalentSummaryCard
          insights={insights}
          positionId={employee.position_id}
        />
      </DashboardSection>

      <DashboardSection title="Informações principais">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard
            label="E-mail"
            value={
              <span className="break-all">
                {employee.email || "-"}
              </span>
            }
          />

          <InfoCard
            label="Telefone"
            value={formatPhone(employee.phone)}
          />

          <InfoCard
            label="DISC"
            value={employee.disc_profile || "-"}
          />
        </div>
      </DashboardSection>

      <DashboardSection title="Gap de competências">
        <CompetencyGapCard gaps={competencyGaps} />
      </DashboardSection>

      <DashboardSection title="Competências registradas">
        <EmployeeCompetenciesCard
          competencies={employeeCompetencies ?? []}
        />
      </DashboardSection>

      <EmployeeProfileTimeline hireDate={employee.hire_date} />

      <DashboardSection title="Próximos módulos">
        <DashboardCard>
          <div className="space-y-3 text-sm text-slate-600">
            <p>⏳ Avaliações serão adicionadas em breve.</p>
            <p>⏳ Feedbacks serão adicionados em breve.</p>
            <p>⏳ PDI será adicionado em breve.</p>
          </div>
        </DashboardCard>
      </DashboardSection>
    </EmployeeProfileLayout>
  )
}
