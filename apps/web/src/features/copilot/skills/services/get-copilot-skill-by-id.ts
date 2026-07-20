import type { CopilotSkillId } from "../types"
import { copilotSkills } from "../registry"

export function getCopilotSkillById(
  id: CopilotSkillId
) {
  return copilotSkills.find(
    (skill) => skill.id === id
  ) ?? null
}
