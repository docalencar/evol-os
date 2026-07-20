import type {
  ExecutiveAiContextEntityType,
} from "../../context"

import { copilotSkills } from "../registry"

export function getCopilotSkillsByEntity(
  entityType: ExecutiveAiContextEntityType
) {
  return copilotSkills.filter(
    (skill) =>
      skill.supportedEntityTypes.includes(
        entityType
      )
  )
}
