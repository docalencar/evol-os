import type {
  ScenarioExecutiveSummary,
} from "../../intelligence"

import type {
  DecisionAction,
  DecisionConfidence,
  DecisionConfidenceLevel,
  DecisionReason,
  ScenarioDecision,
  ScenarioRecommendation,
} from "../types"

export type CreateScenarioRecommendationInput =
  Readonly<{
    scenarioId: string
    summary:
      ScenarioExecutiveSummary
    generatedAt?: Date
  }>

function clampScore(
  score: number
): number {
  return Math.min(
    100,
    Math.max(0, score)
  )
}

function getConfidenceLevel(
  score: number
): DecisionConfidenceLevel {
  if (score >= 90) {
    return "very_high"
  }

  if (score >= 75) {
    return "high"
  }

  if (score >= 55) {
    return "medium"
  }

  return "low"
}

function calculateRecommendation(
  summary:
    ScenarioExecutiveSummary
): ScenarioRecommendation {
  if (
    summary.recommendation ===
      "reject" ||
    (
      summary.status ===
        "critical" &&
      summary.criticalRisks > 0
    )
  ) {
    return "reject"
  }

  if (
    summary.recommendation ===
      "review" ||
    summary.status === "critical"
  ) {
    return "request_revision"
  }

  const totalWarnings =
    summary.structuralWarnings +
    summary.leadershipWarnings +
    summary.capacityWarnings

  if (
    summary.status ===
      "attention" ||
    totalWarnings > 0 ||
    summary.criticalRisks > 0
  ) {
    return "approve_with_attention"
  }

  return "approve"
}

function calculateConfidence(
  summary:
    ScenarioExecutiveSummary,
  recommendation:
    ScenarioRecommendation
): DecisionConfidence {
  const totalWarnings =
    summary.structuralWarnings +
    summary.leadershipWarnings +
    summary.capacityWarnings

  const recommendationAlignment =
    (
      recommendation === "approve" &&
      summary.recommendation ===
        "approve" &&
      summary.status === "healthy"
    ) ||
    (
      recommendation ===
        "approve_with_attention" &&
      summary.recommendation ===
        "approve" &&
      summary.status ===
        "attention"
    ) ||
    (
      recommendation ===
        "request_revision" &&
      summary.recommendation ===
        "review"
    ) ||
    (
      recommendation ===
        "reject" &&
      summary.recommendation ===
        "reject"
    )

  let score = recommendationAlignment
    ? 92
    : 78

  score -= Math.min(
    totalWarnings * 3,
    24
  )

  score -= Math.min(
    summary.criticalRisks * 5,
    20
  )

  if (
    recommendation === "reject" &&
    summary.criticalRisks > 0
  ) {
    score += 8
  }

  if (
    recommendation ===
      "request_revision" &&
    totalWarnings > 0
  ) {
    score += 4
  }

  if (
    summary.totalChanges === 0
  ) {
    score -= 12
  }

  const normalizedScore =
    clampScore(score)

  return Object.freeze({
    score: normalizedScore,
    level:
      getConfidenceLevel(
        normalizedScore
      ),
  })
}

function createSummaryReason(
  summary:
    ScenarioExecutiveSummary,
  recommendation:
    ScenarioRecommendation
): DecisionReason {
  const reasonByRecommendation:
    Record<
      ScenarioRecommendation,
      Readonly<{
        priority:
          DecisionReason["priority"]
        title: string
        impact: string
      }>
    > = {
    approve: {
      priority: "informational",
      title:
        "Cenário estruturalmente saudável",
      impact:
        "O cenário pode avançar para aprovação executiva.",
    },

    approve_with_attention: {
      priority: "medium",
      title:
        "Cenário viável com pontos de atenção",
      impact:
        "A aprovação pode avançar, desde que os alertas identificados sejam acompanhados.",
    },

    request_revision: {
      priority: "high",
      title:
        "Revisão recomendada antes da aprovação",
      impact:
        "O cenário deve retornar para ajustes antes de uma decisão definitiva.",
    },

    reject: {
      priority: "critical",
      title:
        "Cenário não recomendado para aprovação",
      impact:
        "O cenário não deve avançar em sua configuração atual.",
    },
  }

  const configuration =
    reasonByRecommendation[
      recommendation
    ]

  return Object.freeze({
    id: "executive-summary",
    priority:
      configuration.priority,
    source:
      "executive_summary",
    title:
      configuration.title,
    description:
      summary.summary,
    impact:
      configuration.impact,
  })
}

function createWarningReasons(
  summary:
    ScenarioExecutiveSummary
): DecisionReason[] {
  const reasons:
    DecisionReason[] = []

  if (
    summary.structuralWarnings > 0
  ) {
    reasons.push(
      Object.freeze({
        id:
          "structural-warnings",
        priority:
          summary.structuralWarnings >= 3
            ? "high"
            : "medium",
        source:
          "structural_impact",
        title:
          "Alertas de impacto estrutural",
        description:
          `${summary.structuralWarnings} alerta(s) estrutural(is) foram identificados no cenário.`,
        impact:
          "Mudanças na estrutura podem afetar departamentos, times, cargos ou vínculos organizacionais.",
      })
    )
  }

  if (
    summary.leadershipWarnings > 0
  ) {
    reasons.push(
      Object.freeze({
        id:
          "leadership-warnings",
        priority:
          summary.leadershipWarnings >= 3
            ? "high"
            : "medium",
        source:
          "span_of_control",
        title:
          "Alertas de amplitude de liderança",
        description:
          `${summary.leadershipWarnings} alerta(s) de liderança foram identificados.`,
        impact:
          "A distribuição de liderados pode gerar sobrecarga, fragmentação ou desequilíbrio gerencial.",
      })
    )
  }

  if (
    summary.capacityWarnings > 0
  ) {
    reasons.push(
      Object.freeze({
        id:
          "capacity-warnings",
        priority:
          summary.capacityWarnings >= 3
            ? "high"
            : "medium",
        source:
          "position_capacity",
        title:
          "Alertas de capacidade de posições",
        description:
          `${summary.capacityWarnings} alerta(s) de capacidade foram identificados.`,
        impact:
          "A configuração projetada pode criar excesso de vagas, gargalos ou posições incompatíveis com a demanda.",
      })
    )
  }

  if (
    summary.criticalRisks > 0
  ) {
    reasons.push(
      Object.freeze({
        id:
          "critical-risks",
        priority: "critical",
        source:
          "critical_risk",
        title:
          "Riscos críticos identificados",
        description:
          `${summary.criticalRisks} risco(s) crítico(s) foram identificados no cenário.`,
        impact:
          "Os riscos críticos podem comprometer a segurança, a viabilidade ou a execução da reorganização.",
      })
    )
  }

  return reasons
}

function createDecisionActions(
  recommendation:
    ScenarioRecommendation
): DecisionAction[] {
  const approveAction:
    DecisionAction =
    Object.freeze({
      id: "approve-scenario",
      type:
        "approve_scenario",
      label:
        "Aprovar cenário",
      description:
        "Registra a aprovação executiva do cenário.",
      recommended:
        recommendation ===
          "approve" ||
        recommendation ===
          "approve_with_attention",
    })

  const revisionAction:
    DecisionAction =
    Object.freeze({
      id: "request-revision",
      type:
        "request_revision",
      label:
        "Solicitar revisão",
      description:
        "Retorna o cenário para ajustes antes da decisão final.",
      recommended:
        recommendation ===
          "request_revision" ||
        recommendation ===
          "reject",
    })

  const proposalAction:
    DecisionAction =
    Object.freeze({
      id:
        "generate-reorganization-proposal",
      type:
        "generate_reorganization_proposal",
      label:
        "Gerar proposta de reorganização",
      description:
        "Transforma os pontos identificados em uma proposta estruturada de reorganização.",
      recommended:
        recommendation ===
          "request_revision" ||
        recommendation ===
          "reject",
    })

  const comparisonAction:
    DecisionAction =
    Object.freeze({
      id:
        "compare-scenarios",
      type:
        "compare_scenarios",
      label:
        "Comparar cenários",
      description:
        "Compara este cenário com outras alternativas organizacionais.",
      recommended:
        recommendation ===
          "approve_with_attention" ||
        recommendation ===
          "request_revision",
    })

  return [
    approveAction,
    revisionAction,
    proposalAction,
    comparisonAction,
  ]
}

export function createScenarioRecommendation(
  input:
    CreateScenarioRecommendationInput
): ScenarioDecision {
  const recommendation =
    calculateRecommendation(
      input.summary
    )

  const confidence =
    calculateConfidence(
      input.summary,
      recommendation
    )

  const reasons = [
    createSummaryReason(
      input.summary,
      recommendation
    ),
    ...createWarningReasons(
      input.summary
    ),
  ]

  return Object.freeze({
    scenarioId:
      input.scenarioId,

    recommendation,

    confidence,

    reasons:
      Object.freeze(reasons),

    actions:
      Object.freeze(
        createDecisionActions(
          recommendation
        )
      ),

    generatedAt:
      new Date(
        (
          input.generatedAt ??
          new Date()
        ).getTime()
      ),
  })
}
