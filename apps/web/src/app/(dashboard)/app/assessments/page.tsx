import { AssessmentHome } from "@/features/assessments/components/home/assessment-home"
import { getAssessmentCatalogReadModel } from "@/features/assessment-feedback-read"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function AssessmentsPage() {
  const { companyId } =
    await getCurrentCompanyContext()

  const { cycles, templates } =
    await getAssessmentCatalogReadModel(companyId)

  return (
    <AssessmentHome
      companyId={companyId}
      cycles={cycles}
      templates={templates}
    />
  )
}
