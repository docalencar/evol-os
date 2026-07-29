import type { PlanningInsightCategory } from "../../planning-insights"

export const planningEntityLabels = Object.freeze({
  departments: "Departamentos",
  teams: "Times",
  positions: "Cargos",
  employees: "Colaboradores",
  vacancies: "Vagas",
})

export const planningChangeLabels = Object.freeze({
  created: "Criado",
  updated: "Atualizado",
  archived: "Arquivado",
  removed: "Removido",
  transferred: "Transferido",
  terminated: "Desligado",
  closed: "Encerrada",
})

export const planningFieldLabels: Readonly<Record<string, string>> = Object.freeze({
  name: "Nome",
  code: "Código",
  description: "Descrição",
  parentDepartmentId: "Departamento superior",
  departmentId: "Departamento",
  teamId: "Time",
  positionId: "Cargo",
  hierarchicalLevel: "Nível hierárquico",
  weeklyWorkloadHours: "Carga horária semanal",
  workModel: "Modelo de trabalho",
  employmentType: "Tipo de contratação",
  travelRequirement: "Necessidade de viagem",
  placement: "Alocação organizacional",
})

const categoryLabels: Readonly<Record<PlanningInsightCategory, string>> = Object.freeze({
  workforce: "Pessoas",
  structure: "Estrutura",
  mobility: "Mobilidade",
  capacity: "Capacidade",
})

const insightTitles: Readonly<Record<string, string>> = Object.freeze({
  headcount_reduction: "Redução relevante de headcount",
  high_terminations: "Volume elevado de desligamentos",
  high_transfers: "Volume elevado de transferências",
  excessive_structural_changes: "Muitas alterações estruturais",
  departments_removed: "Departamentos removidos",
  validate_succession_plan: "Validar plano de sucessão",
  review_managerial_capacity: "Revisar capacidade gerencial",
  review_operational_impact: "Revisar impacto operacional",
  plan_change_communication: "Planejar comunicação",
  workforce_growth: "Crescimento da organização",
  new_organizational_capacity: "Nova capacidade organizacional",
})

export function getPlanningCategoryLabel(category: PlanningInsightCategory): string {
  return categoryLabels[category]
}

export function getPlanningInsightTitle(id: string): string {
  return insightTitles[id] ?? id
}

export function getPlanningFieldLabel(field: string): string {
  return planningFieldLabels[field] ?? field
}
