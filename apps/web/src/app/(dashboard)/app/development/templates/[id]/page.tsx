import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  ChevronDown,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

import { getCompetencies } from "@/features/competencies"
import {
  DEVELOPMENT_ACTION_TYPE_LABELS,
} from "@/features/development/constants/development-action"
import type {
  DevelopmentTemplateAction,
} from "@/features/development/templates"
import {
  AddTemplateActionDialog,
  AddTemplateCompetencyDialog,
  ApplyDevelopmentTemplateDialog,
  getDevelopmentTemplateActionsByGoalIds,
  getDevelopmentTemplateById,
  getDevelopmentTemplateGoals,
} from "@/features/development/templates"
import {
  getEmployees,
  type Employee,
} from "@/features/people"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

type DevelopmentTemplateGoalView = {
  id: string
  competency_id: string
  description: string | null
  suggested_target_level: number | null
  order_index: number
  competencies:
    | {
        name: string
      }
    | {
        name: string
      }[]
    | null
}

type GoalWithActions =
  DevelopmentTemplateGoalView & {
    actions: DevelopmentTemplateAction[]
  }

function getCompetencyName(
  goal: DevelopmentTemplateGoalView
) {
  if (Array.isArray(goal.competencies)) {
    return (
      goal.competencies[0]?.name ??
      "Competência não encontrada"
    )
  }

  return (
    goal.competencies?.name ??
    "Competência não encontrada"
  )
}

export default async function DevelopmentTemplatePage({
  params,
}: PageProps) {
  const { id } = await params

  const {
    companyId,
    companyName,
  } = await getCurrentCompanyContext()

  const template =
    await getDevelopmentTemplateById(
      companyId,
      id
    )

  if (!template) {
    notFound()
  }

  const [
    goals,
    competencies,
    employeesData,
  ] = await Promise.all([
    getDevelopmentTemplateGoals(id),
    getCompetencies(companyId),
    getEmployees(companyId),
  ])

  const employees =
    (employeesData ?? []) as Employee[]

  const templateGoals =
    goals as DevelopmentTemplateGoalView[]

  const goalIds = templateGoals.map(
    (goal) => goal.id
  )

  const allActions =
    await getDevelopmentTemplateActionsByGoalIds(
      goalIds
    )

  const actionsByGoal = new Map<
    string,
    DevelopmentTemplateAction[]
  >()

  for (const action of allActions) {
    const current =
      actionsByGoal.get(
        action.templateGoalId
      ) ?? []

    current.push(action)

    actionsByGoal.set(
      action.templateGoalId,
      current
    )
  }

  const goalsWithActions: GoalWithActions[] =
    templateGoals.map((goal) => ({
      ...goal,
      actions:
        actionsByGoal.get(goal.id) ?? [],
    }))

  const totalActions =
    goalsWithActions.reduce(
      (total, goal) =>
        total + goal.actions.length,
      0
    )

  return (
    <div className="space-y-6">
      <Link
        href="/app/development/templates"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />

        Voltar para Templates
      </Link>

      <PageHeader
        title={template.name}
        description={
          template.description ??
          "Template de desenvolvimento."
        }
        actions={
          <ApplyDevelopmentTemplateDialog
            templateId={id}
            employees={employees}
          />
        }
      />

      <Card className="grid gap-6 p-6 md:grid-cols-4">
        <div>
          <p className="text-xs uppercase text-slate-500">
            Empresa
          </p>

          <Badge className="mt-2 bg-slate-100 text-slate-700">
            {template.scope === "global"
              ? "Todas as empresas"
              : companyName}
          </Badge>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">
            Duração
          </p>

          <p className="mt-2 text-xl font-semibold">
            {template.suggestedDurationDays ??
              "-"}{" "}
            dias
          </p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">
            Competências
          </p>

          <p className="mt-2 text-xl font-semibold">
            {goalsWithActions.length}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">
            Ações
          </p>

          <p className="mt-2 text-xl font-semibold">
            {totalActions}
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Competências do Template
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Defina quais competências este
              template desenvolverá.
            </p>
          </div>

          <AddTemplateCompetencyDialog
            templateId={id}
            competencies={competencies}
          />
        </div>

        {goalsWithActions.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-10 text-center">
            <h3 className="text-base font-medium">
              Nenhuma competência cadastrada
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Adicione a primeira competência
              para começar a montar este template.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-3">
            {goalsWithActions.map((goal) => (
              <details
                key={goal.id}
                className="group overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 hover:bg-slate-50">
                  <div className="min-w-0">
                    <h3 className="font-medium text-slate-900">
                      {getCompetencyName(goal)}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {goal.actions.length === 1
                        ? "1 ação de desenvolvimento"
                        : `${goal.actions.length} ações de desenvolvimento`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <Badge className="bg-blue-100 text-blue-700">
                      {goal.suggested_target_level
                        ? `Nível ${goal.suggested_target_level}`
                        : "Nível não definido"}
                    </Badge>

                    <ChevronDown className="h-5 w-5 text-slate-500 transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  {goal.actions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
                      <p className="text-sm font-medium text-slate-700">
                        Nenhuma ação cadastrada
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Adicione ações práticas para
                        desenvolver esta competência.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {goal.actions.map((action) => (
                        <div
                          key={action.id}
                          className="rounded-lg border border-slate-200 bg-white p-4"
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <Badge className="mb-2 bg-slate-100 text-slate-700">
                                {
                                  DEVELOPMENT_ACTION_TYPE_LABELS[
                                    action.type
                                  ]
                                }
                              </Badge>

                              <p className="font-medium text-slate-900">
                                {action.title}
                              </p>

                              {action.description ? (
                                <p className="mt-1 text-sm text-slate-500">
                                  {
                                    action.description
                                  }
                                </p>
                              ) : null}
                            </div>

                            <div className="shrink-0 text-sm text-slate-500">
                              {action.suggestedDueDays
                                ? `${action.suggestedDueDays} dias`
                                : "Sem prazo sugerido"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex justify-end">
                    <AddTemplateActionDialog
                      templateId={id}
                      templateGoalId={goal.id}
                    />
                  </div>
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">
          Atividades Recentes
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Em breve exibiremos aqui alterações,
          comentários e evolução deste template.
        </p>
      </Card>
    </div>
  )
}