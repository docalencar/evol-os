import type { AssessmentScoredResult } from "@/features/assessment-feedback-read"

import type {
  AssessmentResultMode,
  AssessmentResultQuestionViewModel,
  AssessmentResultViewModel,
} from "../view-models/assessment-result-view-model"

const percentageFormatter = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const numberFormatter = new Intl.NumberFormat("pt-BR", {
  maximumFractionDigits: 2,
})

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
})

const perspectiveLabels: Record<AssessmentScoredResult["perspective"], string> = {
  self: "Autoavaliação",
  manager: "Gestor",
  direct_report: "Liderados",
  legacy_unknown: "Histórico — perspectiva não identificada",
}

const statusLabels: Record<AssessmentScoredResult["status"], string> = {
  submitted: "Enviada",
  completed: "Concluída",
}

export const NO_QUANTITATIVE_RESULT_COPY = "Sem resultado quantitativo"
export const NO_ANSWER_COPY = "Sem resposta"

export function formatAssessmentPercentage(value: number | null): string {
  return value === null
    ? NO_QUANTITATIVE_RESULT_COPY
    : `${percentageFormatter.format(value)}%`
}

function presentQuestion(
  question: AssessmentScoredResult["questions"][number]
): AssessmentResultQuestionViewModel {
  let answerLabel = NO_ANSWER_COPY

  if (question.type === "scale" && question.rawScore !== null) {
    answerLabel = `${question.rawScore} de ${question.scaleMax}`
  } else if (question.type === "yes_no" && question.answerBoolean !== null) {
    answerLabel = question.answerBoolean ? "Sim" : "Não"
  } else if (question.type === "number" && question.answerNumber !== null) {
    answerLabel = numberFormatter.format(question.answerNumber)
  } else if (question.type === "text" && question.answerText?.trim()) {
    answerLabel = question.answerText
  }

  return {
    id: question.snapshotQuestionId,
    sectionId: question.snapshotSectionId,
    prompt: question.prompt,
    type: question.type,
    answerLabel,
    normalizedScore: question.normalizedScore,
    normalizedScoreLabel:
      question.type === "scale" && question.normalizedScore !== null
        ? formatAssessmentPercentage(question.normalizedScore)
        : null,
    scaleLabel:
      question.type === "scale"
        ? `Escala: ${question.scaleMin} a ${question.scaleMax}`
        : null,
    competencyLabel: question.competencyName,
  }
}

export function presentAssessmentResult(input: Readonly<{
  result: AssessmentScoredResult
  mode: AssessmentResultMode
  submittedAt?: string | null
}>): AssessmentResultViewModel {
  const { result } = input

  return {
    responseId: result.assessmentResponseId,
    mode: input.mode,
    statusLabel: statusLabels[result.status],
    submittedAtLabel: input.submittedAt
      ? dateFormatter.format(new Date(input.submittedAt))
      : null,
    perspective: {
      key: result.perspective,
      label: perspectiveLabels[result.perspective],
    },
    visibility: result.visibility,
    formulaVersion: result.formulaVersion,
    score: {
      value: result.overallScore,
      label: formatAssessmentPercentage(result.overallScore),
    },
    sections: result.sections.map((section) => ({
      id: section.snapshotSectionId,
      name: section.name,
      score: section.score,
      scoreLabel: formatAssessmentPercentage(section.score),
      weight: section.weight,
      weightLabel: `Peso relativo: ${numberFormatter.format(section.weight)}`,
    })),
    competencies: result.competencies.map((competency) => ({
      id: competency.competencyId,
      name: competency.competencyName,
      score: competency.score,
      scoreLabel: formatAssessmentPercentage(competency.score),
    })),
    questions: result.questions.map(presentQuestion),
    qualitativeEvidence: result.answers
      .filter((answer) => Boolean(answer.answerText?.trim()))
      .map((answer) => ({
        id: answer.sourceQuestionId,
        answerLabel: answer.answerText!,
      })),
    hasQuantitativeResult: result.overallScore !== null,
  }
}
