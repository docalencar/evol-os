"use server"

import {
  getCurrentCompanyContext,
} from "@/lib/supabase/supabase/current-company"

import {
  createGlobalCopilotContext,
} from "@/features/copilot/context"

import type {
  CopilotSkill,
} from "@/features/copilot/skills"

import {
  executeCopilotSkill,
} from "../services"

export type ExecuteGlobalCopilotSkillActionState =
  | {
      success: true
      content: string
    }
  | {
      success: false
      message: string
    }

type Input = {
  skill: CopilotSkill
  prompt?: string | null
}

export async function executeGlobalCopilotSkillAction({
  skill,
  prompt = null,
}: Input): Promise<ExecuteGlobalCopilotSkillActionState> {
  try {
    const {
      companyId,
      user,
    } = await getCurrentCompanyContext()

    const context =
      createGlobalCopilotContext({
        companyId,

        user: {
          userId: user.id,
        },
      })

    const response =
      await executeCopilotSkill({
        context,
        skill,
        prompt,
      })

    return {
      success: true,
      content: response.content,
    }
  } catch (error) {
    console.error(error)

    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível executar a skill do Copilot.",
    }
  }
}
