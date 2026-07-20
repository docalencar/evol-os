import type {
  CopilotSkill,
} from "../types"

export const employeeAnalysisSkill: CopilotSkill = {
  id: "employee-analysis",

  title: "Análise de colaborador",

  description:
    "Analisa o contexto individual, destacando evolução, riscos e oportunidades de desenvolvimento.",

  supportedEntityTypes: [
    "employee",
  ],

  capabilities: [
    "analyze",
    "prioritize",
    "recommend",
  ],

  suggestedPrompts: [
    "Analise a situação atual deste colaborador.",
    "Quais são os principais riscos relacionados a esta pessoa?",
    "Quais ações de desenvolvimento são recomendadas?",
  ],

  metadata: {
    category: "people",
    version: "1",
  },
}
