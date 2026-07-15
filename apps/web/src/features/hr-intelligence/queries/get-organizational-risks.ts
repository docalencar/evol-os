import type { OrganizationalRisk } from "../types/organizational-risk"
import type { WorkforceHealth } from "../types/workforce-health"

export async function getOrganizationalRisks(
  health: WorkforceHealth
): Promise<OrganizationalRisk[]> {
  const risks: OrganizationalRisk[] = []

  if (health.criticalEmployees > 0) {
    risks.push({
      title: "Colaboradores em situação crítica",
      description: `${health.criticalEmployees} colaborador(es) não possuem avaliação concluída nem PDI ativo.`,
      severity: "high",
    })
  }

  if (health.attentionEmployees > 0) {
    risks.push({
      title: "Desenvolvimento incompleto",
      description: `${health.attentionEmployees} colaborador(es) possuem avaliação ou PDI, mas ainda não completaram a jornada de desenvolvimento.`,
      severity: "medium",
    })
  }

  if (
    health.totalEmployees > 0 &&
    health.healthyEmployees === health.totalEmployees
  ) {
    risks.push({
      title: "Manter acompanhamento",
      description:
        "Todos os colaboradores estão com avaliação e desenvolvimento acompanhados.",
      severity: "low",
    })
  }

  return risks
}
