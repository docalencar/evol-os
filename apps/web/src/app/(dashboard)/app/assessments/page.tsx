import {
  getAssessmentCycles,
  getAssessmentTemplates,
  type AssessmentCycle,
  type AssessmentTemplate,
} from "@/features/assessments"

import { AssessmentHome } from "@/features/assessments/components/home/assessment-home"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function AssessmentsPage() {
  const { companyId } =
    await getCurrentCompanyContext()

  const [cyclesData, templatesData] =
    await Promise.all([
      getAssessmentCycles(companyId),
      getAssessmentTemplates(companyId),
    ])

  return (
    <AssessmentHome
      companyId={companyId}
      cycles={
        (cyclesData ?? []) as AssessmentCycle[]
      }
      templates={
        (templatesData ?? []) as AssessmentTemplate[]
      }
    />
  )
}
