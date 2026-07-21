import {
  ArrowRight,
  MessageSquareText,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"

import type {
  FeedbackThreadViewModel,
} from "../thread"

type FeedbackThreadHeaderProps = {
  thread: FeedbackThreadViewModel
}

export function FeedbackThreadHeader({
  thread,
}: FeedbackThreadHeaderProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-50 p-2 text-evol-blue">
              <MessageSquareText className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {thread.title}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span className="font-medium">
                  {thread.sender.name}
                </span>

                <ArrowRight className="h-4 w-4 text-slate-400" />

                <span className="font-medium">
                  {thread.receiver.name}
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-slate-500">
            Você participa desta conversa como{" "}
            <span className="font-medium text-slate-700">
              {thread.currentUserRole === "sender"
                ? "remetente"
                : "destinatário"}
            </span>
            .
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge className="bg-slate-100 text-slate-700">
            {thread.typeLabel}
          </Badge>

          <Badge className="bg-blue-50 text-blue-700">
            {thread.statusLabel}
          </Badge>

          <Badge className="bg-amber-50 text-amber-700">
            {thread.priorityLabel}
          </Badge>
        </div>
      </div>
    </Card>
  )
}
