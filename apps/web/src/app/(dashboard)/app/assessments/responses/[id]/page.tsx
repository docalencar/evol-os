import { notFound } from "next/navigation"

import {
  AssessmentExecutionWorkspace,
  AssessmentFeedbackCard,
  AssessmentResultUnavailableState,
  presentAssessmentResult,
  type AssessmentQuestion,
} from "@/features/assessments"
import { EntityBackLink } from "@/components/shared/entity-back-link"
import {
  getAssessmentResponsePageReadModel,
  getAssessmentEvaluateeScoredResultReadModel,
  getAssessmentScoredResultReadModel,
} from "@/features/assessment-feedback-read"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

type Props = {
  params: Promise<{
    id: string
  }>
}

export default async function AssessmentResponsePage({
  params,
}: Props) {
  const { companyId, personId } =
    await getCurrentCompanyContext()

  const { id } = await params

  try {
    const workspace = await getAssessmentResponsePageReadModel(
      companyId,
      id
    ).catch(() => null)

    if (
      workspace &&
      (workspace.response.status === "submitted" ||
        workspace.response.status === "completed")
    ) {
      const scoredResult = await getAssessmentScoredResultReadModel(companyId, id)
      const result = presentAssessmentResult({
        result: scoredResult,
        mode: workspace.mode === "administrative" ? "administrative" : "evaluator",
        submittedAt:
          workspace.response.submitted_at ?? workspace.response.completed_at,
      })

      return (
        <div className="space-y-8">
          <EntityBackLink href="/app/assessments" label="Voltar para avaliações" />
          <AssessmentFeedbackCard result={result} />
        </div>
      )
    }

    if (!workspace) {
      const evaluateeResult = await getAssessmentEvaluateeScoredResultReadModel(
        companyId,
        id
      ).catch(() => null)

      return (
        <div className="space-y-8">
          <EntityBackLink href="/app/assessments" label="Voltar para avaliações" />
          {evaluateeResult ? (
            <AssessmentFeedbackCard
              result={presentAssessmentResult({
                result: evaluateeResult,
                mode: "evaluatee",
              })}
            />
          ) : (
            <AssessmentResultUnavailableState />
          )}
        </div>
      )
    }

    const { template, sections, questions, answers } = workspace

    const questionsBySection = new Map<
      string,
      AssessmentQuestion[]
    >(
      sections.map((section) => [
        section.id,
        questions.filter(
          (question) =>
            question.assessment_section_id ===
            section.id
        ),
      ])
    )

    return (
      <div className="space-y-8">
        <EntityBackLink
          href="/app/assessments"
          label="Voltar para avaliações"
        />

        <AssessmentExecutionWorkspace
          companyId={companyId}
          assessmentResponseId={workspace.response.id}
          responseStatus={workspace.response.status}
          template={template}
          sections={sections}
          questionsBySection={questionsBySection}
          answers={answers}
          canAnswer={
            personId === workspace.response.evaluator_id
          }
        />
      </div>
    )
  } catch {
    notFound()
  }
}
