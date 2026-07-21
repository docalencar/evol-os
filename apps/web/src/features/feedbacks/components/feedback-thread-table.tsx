import Link from "next/link"

import {
  DataTable,
} from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  FEEDBACK_THREAD_TYPE_LABELS,
} from "../constants/feedback-constants"
import type {
  FeedbackThread,
} from "../types/feedback"
import {
  FeedbackPriorityBadge,
} from "./feedback-priority-badge"
import {
  FeedbackStatusBadge,
} from "./feedback-status-badge"

type FeedbackThreadTableProps = {
  threads: FeedbackThread[]
  currentEmployeeId: string
  employeeNameById: Map<string, string>
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  ).format(date)
}

function getEmployeeName(
  employeeId: string,
  employeeNameById: Map<string, string>
) {
  return (
    employeeNameById.get(employeeId) ??
    "Colaborador não encontrado"
  )
}

export function FeedbackThreadTable({
  threads,
  currentEmployeeId,
  employeeNameById,
}: FeedbackThreadTableProps) {
  const orderedThreads = [...threads].sort(
    (firstThread, secondThread) =>
      secondThread.updatedAt.getTime() -
      firstThread.updatedAt.getTime()
  )

  return (
    <DataTable
      title="Conversas de feedback"
      data={orderedThreads}
      rowKey={(thread) => thread.id}
      emptyMessage="Nenhuma conversa de feedback encontrada."
      columns={[
        {
          key: "title",
          header: "Conversa",
          render: (thread) => {
            const isSent =
              thread.senderEmployeeId ===
              currentEmployeeId

            const otherEmployeeId = isSent
              ? thread.receiverEmployeeId
              : thread.senderEmployeeId

            return (
              <div className="min-w-64">
                <p className="font-medium text-slate-900">
                  {thread.title}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge>
                    {isSent
                      ? "Enviado"
                      : "Recebido"}
                  </Badge>

                  <span className="text-xs text-slate-500">
                    {isSent
                      ? "Para"
                      : "De"}{" "}
                    {getEmployeeName(
                      otherEmployeeId,
                      employeeNameById
                    )}
                  </span>
                </div>
              </div>
            )
          },
        },
        {
          key: "type",
          header: "Tipo",
          render: (thread) => (
            <span className="whitespace-nowrap">
              {
                FEEDBACK_THREAD_TYPE_LABELS[
                  thread.type
                ]
              }
            </span>
          ),
        },
        {
          key: "priority",
          header: "Prioridade",
          render: (thread) => (
            <FeedbackPriorityBadge
              priority={thread.priority}
            />
          ),
        },
        {
          key: "status",
          header: "Status",
          render: (thread) => (
            <FeedbackStatusBadge
              status={thread.status}
            />
          ),
        },
        {
          key: "updatedAt",
          header: "Atualizado em",
          render: (thread) => (
            <span className="whitespace-nowrap">
              {formatDate(thread.updatedAt)}
            </span>
          ),
        },
        {
          key: "actions",
          header: "Ações",
          render: (thread) => (
            <Button
              variant="outline"
              size="sm"
              render={
                <Link
                  href={`/app/feedbacks/${thread.id}`}
                />
              }
            >
              Abrir conversa
            </Button>
          ),
        },
      ]}
    />
  )
}
