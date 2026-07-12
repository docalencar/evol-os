import Link from "next/link"
import { notFound } from "next/navigation"
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Target,
  UserRound,
} from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

import {
  DEVELOPMENT_ACTION_STATUS_LABELS,
  DEVELOPMENT_ACTION_TYPE_LABELS,
  DEVELOPMENT_GOAL_STATUS_LABELS,
  DEVELOPMENT_PLAN_PRIORITY_LABELS,
  DEVELOPMENT_PLAN_STATUS_LABELS,
  getDevelopmentActionsByGoalIds,
  getDevelopmentGoalsByPlan,
  getDevelopmentPlanById,
  type DevelopmentAction,
  type DevelopmentGoal,
} from "@/features/development"

import {
  getEmployeeById,
  type Employee,
} from "@/features/people"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type PageProps = {
  params: Promise<{
    id: string
  }>
}

type GoalWithActions = DevelopmentGoal & {
  actions: DevelopmentAction[]
}

function formatDate(date: string | null) {
  if (!date) {
    return "Não definida"
  }

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${date}T00:00:00`)
  )
}

function getEmployeeName(
  employee: Employee | null
) {
  return employee?.full_name ?? "Não definido"
}

export default async function DevelopmentPlanPage({
  params,
}: PageProps) {
  const { id } = await params

  const { companyId } =
    await getCurrentCompanyContext()

  const plan =
    await getDevelopmentPlanById(
      companyId,
      id
    )

  if (!plan) {
    notFound()
  }

  const [goals, employee, owner] =
    await Promise.all([
      getDevelopmentGoalsByPlan(
        companyId,
        id
      ),
      getEmployeeById(
        companyId,
        plan.employeeId
      ),
      plan.ownerId
        ? getEmployeeById(
            companyId,
            plan.ownerId
          )
        : Promise.resolve(null),
    ])

  const goalIds = goals.map(
    (goal) => goal.id
  )

  const actions =
    await getDevelopmentActionsByGoalIds(
      companyId,
      goalIds
    )

  const actionsByGoal = new Map<
    string,
    DevelopmentAction[]
  >()

  for (const action of actions) {
    const current =
      actionsByGoal.get(
        action.goalId
      ) ?? []

    current.push(action)

    actionsByGoal.set(
      action.goalId,
      current
    )
  }

  const goalsWithActions: GoalWithActions[] =
    goals.map((goal) => ({
      ...goal,
      actions:
        actionsByGoal.get(goal.id) ?? [],
    }))

  const totalActions = actions.length

  const completedActions =
    actions.filter(
      (action) =>
        action.status === "completed"
    ).length

  const progress =
    totalActions === 0
      ? 0
      : Math.round(
          (completedActions /
            totalActions) *
            100
        )

  return (
    <div className="space-y-6">
      <Link
        href="/app/development"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />

        Voltar para Desenvolvimento
      </Link>

      <PageHeader
        title={plan.title}
        description={
          plan.description ??
          "Plano de desenvolvimento individual."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge>
              {
                DEVELOPMENT_PLAN_STATUS_LABELS[
                  plan.status
                ]
              }
            </Badge>

            <Badge>
              Prioridade{" "}
              {
                DEVELOPMENT_PLAN_PRIORITY_LABELS[
                  plan.priority
                ]
              }
            </Badge>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-slate-500" />

            <div>
              <p className="text-xs uppercase text-slate-500">
                Colaborador
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {getEmployeeName(
                  employee as Employee | null
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-slate-500" />

            <div>
              <p className="text-xs uppercase text-slate-500">
                Responsável
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {getEmployeeName(
                  owner as Employee | null
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-slate-500" />

            <div>
              <p className="text-xs uppercase text-slate-500">
                Período
              </p>

              <p className="mt-1 font-medium text-slate-900">
                {formatDate(plan.startDate)}
              </p>

              <p className="text-sm text-slate-500">
                até {formatDate(plan.dueDate)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-slate-500" />

            <div>
              <p className="text-xs uppercase text-slate-500">
                Progresso
              </p>

              <p className="mt-1 text-xl font-semibold text-slate-900">
                {progress}%
              </p>

              <p className="text-sm text-slate-500">
                {completedActions} de{" "}
                {totalActions} ações
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Competências e ações
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Acompanhe os objetivos e as ações
            deste plano.
          </p>
        </div>

        {goalsWithActions.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-10 text-center">
            <h3 className="font-medium text-slate-900">
              Nenhum objetivo cadastrado
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Este plano ainda não possui
              competências associadas.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {goalsWithActions.map((goal) => (
              <details
                key={goal.id}
                className="group overflow-hidden rounded-lg border border-slate-200 bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4 hover:bg-slate-50">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-slate-900">
                        {goal.title}
                      </h3>

                      <Badge>
                        {
                          DEVELOPMENT_GOAL_STATUS_LABELS[
                            goal.status
                          ]
                        }
                      </Badge>
                    </div>

                    {goal.description ? (
                      <p className="mt-1 text-sm text-slate-500">
                        {goal.description}
                      </p>
                    ) : null}

                    <p className="mt-2 text-sm text-slate-500">
                      Atual: {goal.currentLevel}
                      {" · "}
                      Esperado:{" "}
                      {goal.expectedLevel}
                      {" · "}
                      Meta: {goal.targetLevel}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-sm text-slate-500">
                      {goal.actions.length === 1
                        ? "1 ação"
                        : `${goal.actions.length} ações`}
                    </span>

                    <ChevronDown className="h-5 w-5 text-slate-500 transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  {goal.actions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
                      <p className="text-sm text-slate-500">
                        Nenhuma ação cadastrada
                        para esta competência.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {goal.actions.map(
                        (action) => (
                          <div
                            key={action.id}
                            className="rounded-lg border border-slate-200 bg-white p-4"
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <div className="flex flex-wrap gap-2">
                                  <Badge>
                                    {
                                      DEVELOPMENT_ACTION_TYPE_LABELS[
                                        action.type
                                      ]
                                    }
                                  </Badge>

                                  <Badge>
                                    {
                                      DEVELOPMENT_ACTION_STATUS_LABELS[
                                        action.status
                                      ]
                                    }
                                  </Badge>
                                </div>

                                <p className="mt-3 font-medium text-slate-900">
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

                              <p className="shrink-0 text-sm text-slate-500">
                                Prazo:{" "}
                                {formatDate(
                                  action.dueDate
                                )}
                              </p>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
