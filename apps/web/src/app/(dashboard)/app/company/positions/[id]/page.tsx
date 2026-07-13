import {
  redirect,
} from "next/navigation"
import { z } from "zod"

import {
  DashboardCard,
  DashboardEmptyState,
  DashboardSection,
  InfoCard,
} from "@/components/dashboard"

import {
  PageHeader,
} from "@/components/shared/page-header"

import {
  getCompetencies,
} from "@/features/competencies"

import {
  getPositionCompetenciesByPosition,
  PositionCompetencyCreateDialog,
} from "@/features/competencies/position-competencies"

import {
  getPositionById,
  PositionEditDialog,
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
type CompetencyRelation =
  | {
      name: string
    }
  | {
      name: string
    }[]
  | null
  
  function getCompetencyName(
  relation: CompetencyRelation
) {
  if (!relation) {
    return "Competência não identificada"
  }

  if (Array.isArray(relation)) {
    return (
      relation[0]?.name ??
      "Competência não identificada"
    )
  }

  return relation.name
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
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Competências esperadas"
            value={competencyCount}
          />

          <InfoCard
            label="Colaboradores vinculados"
            value={
              positionEmployees.length
            }
          />

          <InfoCard
            label="Colaboradores ativos"
            value={activeEmployees}
          />

          <InfoCard
            label="Em afastamento"
            value={onLeaveEmployees}
          />
        </div>
      </DashboardSection>

      <DashboardSection
        title="Competências esperadas"
        description="Defina as competências necessárias para exercer este cargo."
        actions={
          <PositionCompetencyCreateDialog
            companyId={companyId}
            positionId={position.id}
            competencies={
              competencies ?? []
            }
            positionCompetencies={
              positionCompetencies ?? []
            }
          />
        }
      >
        <DashboardCard>
          {competencyCount === 0 ? (
            <DashboardEmptyState
              title="Nenhuma competência configurada"
              description="Adicione as competências esperadas para permitir o cálculo de GAP dos colaboradores deste cargo."
            />
          ) : (
            <div className="divide-y divide-slate-200">
              {positionCompetencies?.map(
                (
                  positionCompetency
                ) => (
                  <div
                    key={
                      positionCompetency.id
                    }
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {getCompetencyName(
                          positionCompetency
                            .competencies as CompetencyRelation
                        )}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Nível esperado:{" "}
                        {positionCompetency.expected_level}
                        /5
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Peso{" "}
                        {
                          positionCompetency.weight
                        }
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {positionCompetency.required
                          ? "Obrigatória"
                          : "Opcional"}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </DashboardCard>
      </DashboardSection>

      <DashboardSection
        title="Colaboradores vinculados"
        description="Pessoas que atualmente ocupam este cargo."
      >
        <DashboardCard>
          {positionEmployees.length ===
          0 ? (
            <DashboardEmptyState
              title="Nenhum colaborador vinculado"
              description="Os colaboradores associados a este cargo aparecerão aqui."
            />
          ) : (
            <div className="divide-y divide-slate-200">
              {positionEmployees.map(
                (employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {
                          employee.full_name
                        }
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {employee.email ??
                          "Sem e-mail cadastrado"}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
                      {employee.status ===
                      "active"
                        ? "Ativo"
                        : employee.status ===
                            "on_leave"
                          ? "Afastado"
                          : "Inativo"}
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </DashboardCard>
      </DashboardSection>

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