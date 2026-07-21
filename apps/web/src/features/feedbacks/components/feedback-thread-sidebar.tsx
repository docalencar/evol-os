import {
  CalendarClock,
  Eye,
  Flag,
  UsersRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

import type {
  FeedbackThreadViewModel,
} from "../thread"
import {
  FeedbackThreadActions,
} from "./feedback-thread-actions"

type FeedbackThreadSidebarProps = {
  thread: FeedbackThreadViewModel
}

function formatDate(date: Date | null) {
  if (!date) {
    return "Não informado"
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

type SidebarItemProps = {
  label: string
  value: string
}

function SidebarItem({
  label,
  value,
}: SidebarItemProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-900">
        {value}
      </p>
    </div>
  )
}

export function FeedbackThreadSidebar({
  thread,
}: FeedbackThreadSidebarProps) {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <UsersRound className="h-5 w-5 text-slate-500" />

          <h3 className="font-semibold text-slate-900">
            Participantes
          </h3>
        </div>

        <div className="mt-5 space-y-5">
          <SidebarItem
            label="Remetente"
            value={thread.sender.name}
          />

          <SidebarItem
            label="Destinatário"
            value={thread.receiver.name}
          />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-slate-500" />

          <h3 className="font-semibold text-slate-900">
            Classificação
          </h3>
        </div>

        <div className="mt-5 space-y-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Status
            </p>

            <Badge className="mt-2 bg-blue-50 text-blue-700">
              {thread.statusLabel}
            </Badge>
          </div>

          <SidebarItem
            label="Tipo"
            value={thread.typeLabel}
          />

          <SidebarItem
            label="Prioridade"
            value={thread.priorityLabel}
          />
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-slate-500" />

          <h3 className="font-semibold text-slate-900">
            Visibilidade
          </h3>
        </div>

        <p className="mt-4 text-sm font-medium text-slate-900">
          {thread.visibilityLabel}
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-slate-500" />

          <h3 className="font-semibold text-slate-900">
            Datas
          </h3>
        </div>

        <div className="mt-5 space-y-5">
          <SidebarItem
            label="Criada em"
            value={formatDate(
              thread.createdAt
            )}
          />

          <SidebarItem
            label="Atualizada em"
            value={formatDate(
              thread.updatedAt
            )}
          />

          {thread.requiresFollowUp ? (
            <SidebarItem
              label="Acompanhamento"
              value={formatDate(
                thread.followUpAt
              )}
            />
          ) : null}

          {thread.acknowledgedAt ? (
            <SidebarItem
              label="Confirmada em"
              value={formatDate(
                thread.acknowledgedAt
              )}
            />
          ) : null}

          {thread.closedAt ? (
            <SidebarItem
              label="Encerrada em"
              value={formatDate(
                thread.closedAt
              )}
            />
          ) : null}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-slate-900">
          Ações da conversa
        </h3>

        <div className="mt-4">
          <FeedbackThreadActions
            threadId={thread.id}
            canAcknowledge={
              thread.canAcknowledge
            }
            canClose={thread.canClose}
            canArchive={thread.canArchive}
          />
        </div>
      </Card>
    </div>
  )
}
