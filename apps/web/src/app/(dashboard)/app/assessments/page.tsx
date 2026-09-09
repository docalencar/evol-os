import { AssessmentHome } from "@/features/assessments/components/home/assessment-home"
import { createAssessmentCycleRepository } from "@/features/assessments/repositories/assessment-cycle-repository"
import { createAssessmentResponseRepository } from "@/features/assessments/repositories/assessment-response-repository"
import type { AssessmentCycle } from "@/features/assessments/types/assessment-cycle"
import type { AssessmentResponse } from "@/features/assessments/types/assessment-response"
import {
  getAssessmentCatalogReadModel,
  getCurrentPersonAssessmentResultDirectoryReadModel,
} from "@/features/assessment-feedback-read"
import { presentAssessmentResultDirectory } from "@/features/assessments"
import { isAdministrativeRole } from "@/features/authorization"

import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

export default async function AssessmentsPage() {
  const { companyId, currentUser, personId } =
    await getCurrentCompanyContext()
  const canManageAssessments = isAdministrativeRole(currentUser.role)

  const [catalog, resultDirectoryRows] = await Promise.all([
    canManageAssessments
      ? getAssessmentCatalogReadModel(companyId)
      : Promise.resolve({ cycles: [], templates: [] }),
    getCurrentPersonAssessmentResultDirectoryReadModel(companyId),
  ])

  // Loaded for EVERY person, not only administrators.
  //
  // This read used to be gated on `canManageAssessments`, which meant an
  // ordinary evaluator was never told they had work waiting: the assessment home
  // rendered only their past results, and the one CTA that opens a response sat
  // in the administrative branch. The backend never had that gap — the row-level
  // policy "evaluators read own assessment responses" (0062:307) restricts this
  // very query to `evaluator_id = current_person_id(company_id)`, and `personId`
  // is resolved server-side from the session, never supplied by the caller.
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

  // Administrators see the whole catalog. Everyone else sees only the cycles
  // their own OPEN responses belong to, so the home can name the assessment that
  // is waiting instead of showing a bare button. Restricting to open responses
  // also keeps the priority card from ever offering a link into an
  // administrative cycle page: a cycle with a response is never `scheduled`, and
  // the "open assessment" CTA only appears when there is something to answer.
  let cycles: AssessmentCycle[] = catalog.cycles

  if (!canManageAssessments) {
    const openCycleIds = [
      ...new Set(
        evaluatorResponses
          .filter(
            (response) =>
              response.status === "draft" || response.status === "in_progress"
          )
          .map((response) => response.assessment_cycle_id)
      ),
    ]

    cycles = []

    if (openCycleIds.length > 0) {
      const cycleRepository = await createAssessmentCycleRepository()
      const { data, error } = await cycleRepository.findByIds(
        companyId,
        openCycleIds
      )

      if (!error && data) {
        cycles = data as AssessmentCycle[]
      }
    }
  }

  return (
    <AssessmentHome
      companyId={companyId}
      cycles={cycles}
      templates={catalog.templates}
      evaluatorResponses={evaluatorResponses}
      resultDirectory={presentAssessmentResultDirectory(resultDirectoryRows)}
      canManageAssessments={canManageAssessments}
    />
  )
}
