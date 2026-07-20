import type {
  ExecutiveAiContextEntityType,
} from "../../context"

export type CopilotSkillId =
  | "executive-summary"
  | "employee-analysis"
  | "organizational-risks"

export type CopilotSkillCapability =
  | "summarize"
  | "analyze"
  | "prioritize"
  | "recommend"

export type CopilotSkill = {
  id: CopilotSkillId

  title: string

  description: string

  supportedEntityTypes:
    ExecutiveAiContextEntityType[]

  capabilities:
    CopilotSkillCapability[]

  suggestedPrompts: string[]

  metadata: Record<string, string>
}
