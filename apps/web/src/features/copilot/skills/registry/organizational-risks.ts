import type {
  CopilotSkill,
} from "../types"

export const organizationalRisksSkill: CopilotSkill = {
  id: "organizational-risks",

  title: "Riscos organizacionais",

  description:
    "Identifica sinais de risco, prioriza ocorrências e sugere ações gerenciais.",

  supportedEntityTypes: [
    "organization",
    "department",
    "team",
  ],

  capabilities: [
    "analyze",
    "prioritize",
    "recommend",
  ],

  suggestedPrompts: [
    "Quais são os principais riscos desta estrutura?",
    "O que precisa de atenção da liderança?",
    "Quais ações podem reduzir os riscos identificados?",
  ],

  metadata: {
    category: "risk",
    version: "1",
  },
}
