import {
  createCopilotSkillExecution,
} from "../../copilot/skills"

import type {
  CopilotContext,
} from "../../copilot/context"

import {
  MockAiProvider,
} from "../providers"

import type {
  AiResponse,
} from "../providers"

import type {
  CopilotSkill,
} from "../../copilot/skills"

export type ExecuteCopilotSkillInput = {
  context: CopilotContext
  skill: CopilotSkill
  prompt?: string | null
}

export async function executeCopilotSkill({
  context,
  skill,
  prompt = null,
}: ExecuteCopilotSkillInput): Promise<AiResponse> {
  const execution = createCopilotSkillExecution({
    context,
    skill,
    prompt,
  })

  const provider = new MockAiProvider()

  return provider.execute({
    type: "skill",
    execution,
    metadata: {},
  })
}
