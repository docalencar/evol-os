import {
  PageHeader,
} from "@/components/shared/page-header"
import {
  FeedbackDashboardKpiCards,
  FeedbackThreadTable,
  getFeedbackThreads,
} from "@/features/feedbacks"
import {
  getEmployees,
} from "@/features/people"
import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

export default async function FeedbacksPage() {
  const {
    companyId,
    personId,
  } = await getCurrentCompanyContext()

  const employees =
    (await getEmployees(companyId)) ?? []

  const employeeNameById = new Map(
    employees.map((employee) => [
      employee.id,
      employee.full_name,
    ])
  )

  const threads = personId
    ? await getFeedbackThreads({
        companyId,
        employeeId: personId,
      })
    : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feedbacks"
        description="Acompanhe conversas, reconhecimentos, feedforwards e alinhamentos profissionais."
      />

      {personId ? (
        <>
          <FeedbackDashboardKpiCards
            threads={threads}
            currentEmployeeId={personId}
          />

          <FeedbackThreadTable
            threads={threads}
            currentEmployeeId={personId}
            employeeNameById={
              employeeNameById
            }
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
