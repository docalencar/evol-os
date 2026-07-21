import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { z } from "zod"

import {
  PageHeader,
} from "@/components/shared/page-header"

import {
  FeedbackMessageList,
} from "@/features/feedbacks/components/feedback-message-list"
import {
  FeedbackReplyForm,
} from "@/features/feedbacks/components/feedback-reply-form"
import {
  FeedbackThreadHeader,
} from "@/features/feedbacks/components/feedback-thread-header"
import {
  FeedbackThreadSidebar,
} from "@/features/feedbacks/components/feedback-thread-sidebar"

import {
  getFeedbackMessages,
} from "@/features/feedbacks/queries/get-feedback-messages"
import {
  getFeedbackThreadById,
} from "@/features/feedbacks/queries/get-feedback-thread-by-id"
import {
  presentFeedbackThread,
} from "@/features/feedbacks/thread"

import {
  getEmployees,
  type Employee,
} from "@/features/people"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

type FeedbackThreadPageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function FeedbackThreadPage({
  params,
}: FeedbackThreadPageProps) {
  const { id } = await params

  const threadIdResult =
    z.string().uuid().safeParse(id)

  if (!threadIdResult.success) {
    redirect("/app/feedbacks")
  }

  const threadId = threadIdResult.data

  const {
    companyId,
    personId,
  } = await getCurrentCompanyContext()

  if (!personId) {
    redirect("/app/feedbacks")
  }

  const [
    thread,
    messages,
    employeesData,
  ] = await Promise.all([
    getFeedbackThreadById({
      companyId,
      threadId,
    }),

    getFeedbackMessages({
      companyId,
      threadId,
    }),

    getEmployees(companyId),
  ])

  if (!thread) {
    redirect("/app/feedbacks")
  }

  const isParticipant =
    thread.senderEmployeeId === personId ||
    thread.receiverEmployeeId === personId

  if (!isParticipant) {
    redirect("/app/feedbacks")
  }

  const employees =
    (employeesData ?? []) as Employee[]

  const viewModel =
    presentFeedbackThread({
      thread,
      messages,
      employees,
      currentEmployeeId: personId,
    })

  return (
    <div className="space-y-6">
      <Link
        href="/app/feedbacks"
        className="inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />

        Voltar para Feedbacks
      </Link>

      <PageHeader
        title="Conversa de feedback"
        description="Acompanhe as mensagens, confirmações e ações relacionadas a este feedback."
      />

      <FeedbackThreadHeader
        thread={viewModel}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <main className="min-w-0 space-y-6">
          <FeedbackMessageList
            messages={viewModel.messages}
          />

          <FeedbackReplyForm
            threadId={viewModel.id}
            canReply={viewModel.canReply}
          />
        </main>

        <aside>
          <FeedbackThreadSidebar
            thread={viewModel}
          />
        </aside>
      </div>
    </div>
  )
}
