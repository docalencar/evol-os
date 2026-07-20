import type {
  CopilotSkill,
} from "../types"

import {
  copilotSkills,
} from "../registry"

export function getGlobalCopilotSkills(): CopilotSkill[] {
  return copilotSkills.filter(
    (skill) =>
      skill.id === "executive-summary" ||
      skill.id === "organizational-risks"
  )
}
