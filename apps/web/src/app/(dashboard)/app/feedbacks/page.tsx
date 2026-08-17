import {
  PageHeader,
} from "@/components/shared/page-header"
import {
  FeedbackDashboardKpiCards,
  FeedbackThreadTable,
} from "@/features/feedbacks"
import { getFeedbackDirectoryReadModel } from "@/features/assessment-feedback-read"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

export default async function FeedbacksPage() {
  const {
    companyId,
    personId,
  } = await getCurrentCompanyContext()

  const threads =
    await getFeedbackDirectoryReadModel(companyId)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedbacks"
        description="Acompanhe conversas, reconhecimentos, feedforwards e alinhamentos profissionais."
      />

      {personId || threads.length > 0 ? (
        <>
          <FeedbackDashboardKpiCards
            threads={threads}
            currentEmployeeId={personId ?? ""}
          />

          <FeedbackThreadTable
            threads={threads}
            currentEmployeeId={personId ?? ""}
          />
        </>
      ) : (
        <div className="rounded-card border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Perfil de colaborador não encontrado
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Seu usuário precisa estar vinculado a um
            colaborador da empresa para acessar as
            conversas de feedback.
          </p>
        </div>
      )}
    </div>
  )
}
