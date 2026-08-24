import { AssessmentHome } from "@/features/assessments/components/home/assessment-home"
import { createAssessmentResponseRepository } from "@/features/assessments/repositories/assessment-response-repository"
import type { AssessmentResponse } from "@/features/assessments/types/assessment-response"
import { getAssessmentCatalogReadModel } from "@/features/assessment-feedback-read"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function AssessmentsPage() {
  const { companyId, personId } =
    await getCurrentCompanyContext()

  const { cycles, templates } =
    await getAssessmentCatalogReadModel(companyId)

  let evaluatorResponses: AssessmentResponse[] = []

  if (personId) {
    const repository = await createAssessmentResponseRepository()
    const { data, error } = await repository.findByEvaluator(
      companyId,
      personId
    )

    if (!error && data) {
      evaluatorResponses = data as AssessmentResponse[]
    }
  }

  return (
    <AssessmentHome
      companyId={companyId}
      cycles={cycles}
      templates={templates}
      evaluatorResponses={evaluatorResponses}
    />
  )
}
