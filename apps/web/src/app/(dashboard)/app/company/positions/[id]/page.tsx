import {
  redirect,
} from "next/navigation"

import { z } from "zod"

import {
  DashboardCard,
  DashboardEmptyState,
  DashboardSection,
} from "@/components/dashboard"

import {
  PageHeader,
} from "@/components/shared/page-header"

import {
  getCompetencies,
} from "@/features/competencies"

import {
  getPositionCompetenciesByPosition,
} from "@/features/competencies/position-competencies"

import {
  getPositionById,
  PositionCompetenciesCard,
  PositionEditDialog,
  PositionEmployeesCard,
  PositionOverviewCard,
} from "@/features/organization/positions"

import {
  getEmployees,
  type Employee,
} from "@/features/people"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

type PositionDetailsPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function PositionDetailsPage({
  params,
}: PositionDetailsPageProps) {
  const { id } = await params

  const positionIdResult =
    z.string().uuid().safeParse(id)

  if (!positionIdResult.success) {
    redirect(
      "/app/company/positions"
    )
  }

  const positionId =
    positionIdResult.data

  const { companyId } =
    await getCurrentCompanyContext()

  const [
    position,
    positionCompetencies,
    competencies,
    employeesData,
  ] = await Promise.all([
    getPositionById(
      companyId,
      positionId
    ),

    getPositionCompetenciesByPosition(
      companyId,
      positionId
    ),

    getCompetencies(
      companyId
    ),

    getEmployees(
      companyId
    ),
  ])

  if (!position) {
    redirect(
      "/app/company/positions"
    )
  }

  const employees =
    (employeesData ?? []) as Employee[]

  const positionEmployees =
    employees.filter(
      (employee) =>
        employee.position_id ===
        position.id
    )

  const activeEmployees =
    positionEmployees.filter(
      (employee) =>
        employee.status === "active"
    ).length

  const onLeaveEmployees =
    positionEmployees.filter(
      (employee) =>
        employee.status === "on_leave"
    ).length

  const competencyCount =
    positionCompetencies?.length ?? 0

  return (
    <div className="space-y-8">
      <PageHeader
        title={position.name}
        description={
          position.description ??
          "Cargo sem descrição cadastrada."
        }
        actions={
          <PositionEditDialog
            companyId={companyId}
            position={position}
          />
        }
      />

      <DashboardSection
        title="Visão geral"
        description="Resumo do cargo e dos vínculos atuais."
      >
        <PositionOverviewCard
          competencyCount={
            competencyCount
          }
          employeeCount={
            positionEmployees.length
          }
          activeEmployees={
            activeEmployees
          }
          onLeaveEmployees={
            onLeaveEmployees
          }
        />
      </DashboardSection>

      <PositionCompetenciesCard
        companyId={companyId}
        positionId={position.id}
        competencies={
          competencies ?? []
        }
        positionCompetencies={
          positionCompetencies ?? []
        }
      />

      <PositionEmployeesCard
        employees={positionEmployees}
      />

      <DashboardSection
        title="Requisitos técnicos"
        description="Formação, certificações, experiência e demais requisitos do cargo."
      >
        <DashboardCard>
          <DashboardEmptyState
            title="Disponível em breve"
            description="Os requisitos técnicos serão implementados em uma etapa futura e permanecerão separados das competências."
          />
        </DashboardCard>
      </DashboardSection>
    </div>
  )
}