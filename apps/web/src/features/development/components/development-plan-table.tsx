import Link from "next/link"

import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  DEVELOPMENT_PLAN_PRIORITY_LABELS,
  DEVELOPMENT_PLAN_STATUS_LABELS,
} from "../constants/development-plan"

import type {
  DevelopmentPlanListItem,
} from "../types/development-plan-list-item"


type DevelopmentPlanTableProps = {
  plans: DevelopmentPlanListItem[]
}

function formatDate(date: string | null) {
  if (!date) {
    return "Sem prazo"
  }

  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(
    new Date(`${date}T00:00:00`)
  )
}

function ProgressIndicator({
  progress,
}: {
  progress: number
}) {
  return (
    <div className="min-w-32">
      <span className="text-sm font-medium text-slate-700">
        {progress}%
      </span>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900 transition-all"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  )
}

export function DevelopmentPlanTable({
  plans,
}: DevelopmentPlanTableProps) {
  return (
    <DataTable
      title="Planos de Desenvolvimento"
      data={plans}
      rowKey={(item) => item.plan.id}
      emptyMessage="Nenhum plano de desenvolvimento cadastrado."
      columns={[
        {
          key: "title",
          header: "Plano",
          render: (item) => (
            <span className="font-medium text-slate-900">
              {item.plan.title}
            </span>
          ),
        },
        {
          key: "employee",
          header: "Colaborador",
          render: (item) =>
            item.employeeName,
        },
        {
          key: "owner",
          header: "Responsável",
          render: (item) =>
            item.ownerName ??
            "Não definido",
        },
        {
          key: "status",
          header: "Status",
          render: (item) => (
            <Badge>
              {
                DEVELOPMENT_PLAN_STATUS_LABELS[
                  item.plan.status
                ]
              }
            </Badge>
          ),
        },
        {
          key: "priority",
          header: "Prioridade",
          render: (item) => (
            <Badge>
              {
                DEVELOPMENT_PLAN_PRIORITY_LABELS[
                  item.plan.priority
                ]
              }
            </Badge>
          ),
        },
        {
          key: "progress",
          header: "Progresso",
          render: (item) => (
            <ProgressIndicator
              progress={item.progress}
            />
          ),
        },
        {
          key: "dueDate",
          header: "Prazo",
          render: (item) =>
            formatDate(
              item.plan.dueDate
            ),
        },
        {
          key: "actions",
          header: "Ações",
          render: (item) => (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                 size="sm"
                 nativeButton={false}
                  render={
                  <Link
                    href={`/app/development/plans/${item.plan.id}`}
                  />
                }
              >
                  Abrir plano
              </Button>

            </div>
          ),
        },
      ]}
    />
  )
}
