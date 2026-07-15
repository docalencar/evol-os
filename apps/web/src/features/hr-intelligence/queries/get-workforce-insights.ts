import type { WorkforceHealth } from "../types/workforce-health"
import type { WorkforceInsight } from "../types/workforce-insight"

export async function getWorkforceInsights(
  health: WorkforceHealth
): Promise<WorkforceInsight[]> {
  const insights: WorkforceInsight[] = []

  if (health.criticalEmployees > 0) {
    insights.push({
      title: "Prioridade imediata",
      description:
        "Existem colaboradores sem avaliação concluída e sem PDI ativo.",
    })
  }

  if (health.attentionEmployees > 0) {
    insights.push({
      title: "Oportunidade de desenvolvimento",
      description:
        "Existem colaboradores que precisam concluir sua jornada de desenvolvimento.",
    })
  }

  if (
    health.totalEmployees > 0 &&
    health.healthyEmployees === health.totalEmployees
  ) {
    insights.push({
      title: "Organização saudável",
      description:
        "Todos os colaboradores possuem avaliação e desenvolvimento acompanhados.",
    })
  }

  return insights
}
