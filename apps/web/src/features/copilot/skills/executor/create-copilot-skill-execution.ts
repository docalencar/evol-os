import type {
  CopilotContext,
} from "../../context"

import type {
  CopilotSkill,
  CopilotSkillExecution,
} from "../types"

export type CreateCopilotSkillExecutionInput = {
  skill: CopilotSkill

  context: CopilotContext

  prompt?: string | null

  metadata?: Record<string, unknown>
}

export function createCopilotSkillExecution({
  skill,
  context,
  prompt = null,
  metadata = {},
}: CreateCopilotSkillExecutionInput): CopilotSkillExecution {
  return {
    skill,

    context,

    prompt,

    metadata,

    createdAt: new Date().toISOString(),
  }
}
