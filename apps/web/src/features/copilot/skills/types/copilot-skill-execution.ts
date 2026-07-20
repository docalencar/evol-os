import type {
  CopilotContext,
} from "../../context"

import type {
  CopilotSkill,
} from "./copilot-skill"

export type CopilotSkillExecution = {
  skill: CopilotSkill

  context: CopilotContext

  prompt: string | null

  metadata: Record<string, unknown>

  createdAt: string
}
