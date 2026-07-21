import {
  MessageSquareText,
} from "lucide-react"

import { Card } from "@/components/ui/card"

import type {
  FeedbackThreadMessageViewModel,
} from "../thread"
import {
  FeedbackMessageCard,
} from "./feedback-message-card"

type FeedbackMessageListProps = {
  messages: FeedbackThreadMessageViewModel[]
}

export function FeedbackMessageList({
  messages,
}: FeedbackMessageListProps) {
  if (messages.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-slate-100 p-3 text-slate-500">
            <MessageSquareText className="h-6 w-6" />
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            Nenhuma mensagem registrada
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            A conversa ainda não possui mensagens
            disponíveis.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <FeedbackMessageCard
          key={message.id}
          message={message}
        />
      ))}
    </div>
  )
}
