import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { z } from "zod"

import {
  PageHeader,
} from "@/components/shared/page-header"

import {
  FeedbackMessageList,
  FeedbackReplyForm,
  FeedbackThreadHeader,
  FeedbackThreadSidebar,
  FeedbackThreadTable,
  presentFeedbackThread,
} from "@/features/feedbacks"
import {
  getFeedbackDirectoryReadModel,
  getFeedbackThreadReadModel,
} from "@/features/assessment-feedback-read"

import {
  FeedbackAiAnalysisCard,
} from "@/features/feedbacks/intelligence"

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

  const [threadReadModel, threads] = await Promise.all([
    getFeedbackThreadReadModel(companyId, threadId),
    getFeedbackDirectoryReadModel(companyId),
  ])

  if (!threadReadModel) {
    notFound()
  }

  const viewModel =
    presentFeedbackThread({
      thread: threadReadModel.thread,
      messages: threadReadModel.messages,
      currentEmployeeId: personId ?? "",
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

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.5fr)_320px]">
        <aside className="min-w-0">
          <FeedbackThreadTable
            threads={threads}
            currentEmployeeId={personId ?? ""}
          />
        </aside>

        <main className="min-w-0 space-y-6">
          <FeedbackThreadHeader
            thread={viewModel}
          />

          {viewModel.currentUserRole !== "hr_observer" ? (
            <FeedbackAiAnalysisCard
              threadId={viewModel.id}
            />
          ) : null}

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
