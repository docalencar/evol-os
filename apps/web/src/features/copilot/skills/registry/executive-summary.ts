import type {
  CopilotSkill,
} from "../types"

export const executiveSummarySkill: CopilotSkill = {
  id: "executive-summary",

  title: "Resumo executivo",

  description:
    "Consolida métricas, riscos, insights e recomendações da entidade atual.",

  supportedEntityTypes: [
    "organization",
    "department",
    "team",
    "position",
    "employee",
  ],

  capabilities: [
    "summarize",
    "prioritize",
    "recommend",
  ],

  suggestedPrompts: [
    "Resuma os principais pontos desta entidade.",
    "Quais informações exigem atenção imediata?",
    "Quais ações devem ser priorizadas?",
  ],

  metadata: {
    category: "executive",
    version: "1",
  },
}
