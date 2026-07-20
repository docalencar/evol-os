import type { AssessmentCycleProgressViewModel } from "@/features/assessments/view-models/assessment-cycle-progress-view-model"
import type { AssessmentCycleResultsViewModel } from "@/features/assessments/view-models/assessment-cycle-results-view-model"

type Input = {
  participants: number
  progress: AssessmentCycleProgressViewModel
}

export function presentAssessmentCycleResults({
  participants,
  progress,
}: Input): AssessmentCycleResultsViewModel {
  return {
    completionPercentage: progress.completionPercentage,

    hasResponses: progress.total > 0,

    metrics: [
      {
        label: "Participantes",
        value: participants,
      },
      {
        label: "Avaliações",
        value: progress.total,
      },
      {
        label: "Concluídas",
        value: progress.finished,
      },
      {
        label: "Pendentes",
        value: progress.pending,
      },
      {
        label: "Taxa de conclusão",
        value: `${progress.completionPercentage}%`,
      },
    ],
  }
}
