import {
  Bot,
  UserRound,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { cn } from "@/utils/cn"

import type {
  FeedbackThreadMessageViewModel,
} from "../thread"

type FeedbackMessageCardProps = {
  message: FeedbackThreadMessageViewModel
}

function formatMessageDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date)
}

export function FeedbackMessageCard({
  message,
}: FeedbackMessageCardProps) {
  if (message.isSystemMessage) {
    return (
      <div className="flex justify-center">
        <div className="flex max-w-2xl items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs text-slate-600">
          <Bot className="h-4 w-4" />

          <span>{message.content}</span>

          <span className="text-slate-400">
            {formatMessageDate(
              message.createdAt
            )}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex",
        message.isCurrentUser
          ? "justify-end"
          : "justify-start"
      )}
    >
      <Card
        className={cn(
          "w-full max-w-2xl p-4",
          message.isCurrentUser
            ? "border-blue-200 bg-blue-50"
            : "bg-white"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-full p-2",
              message.isCurrentUser
                ? "bg-blue-100 text-blue-700"
                : "bg-slate-100 text-slate-600"
            )}
          >
            <UserRound className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {message.authorName}
              </p>

              <p className="text-xs text-slate-500">
                {formatMessageDate(
                  message.createdAt
                )}
              </p>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {message.content}
            </p>

            {message.editedAt ? (
              <p className="mt-2 text-xs text-slate-400">
                Mensagem editada
              </p>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  )
}
