import { AssessmentHome } from "@/features/assessments/components/home/assessment-home"
import { createAssessmentResponseRepository } from "@/features/assessments/repositories/assessment-response-repository"
import type { AssessmentResponse } from "@/features/assessments/types/assessment-response"
import {
  getAssessmentCatalogReadModel,
  getCurrentPersonAssessmentResultDirectoryReadModel,
} from "@/features/assessment-feedback-read"
import { presentAssessmentResultDirectory } from "@/features/assessments"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function AssessmentsPage() {
  const { companyId, personId } =
    await getCurrentCompanyContext()

  const [{ cycles, templates }, resultDirectoryRows] = await Promise.all([
    getAssessmentCatalogReadModel(companyId),
    getCurrentPersonAssessmentResultDirectoryReadModel(companyId),
  ])

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
      resultDirectory={presentAssessmentResultDirectory(resultDirectoryRows)}
    />
  )
}
