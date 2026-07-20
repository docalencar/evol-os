import type {
  ExecutiveCopilotContext,
} from "../../context"

import {
  getCopilotSkillsByEntity,
} from "../services"

export function createCopilotSkillRouter(
  context: ExecutiveCopilotContext
) {
  const availableSkills =
    getCopilotSkillsByEntity(
      context.entity.entityType
    )

  return {
    entityType:
      context.entity.entityType,

    availableSkills,
  }
}
