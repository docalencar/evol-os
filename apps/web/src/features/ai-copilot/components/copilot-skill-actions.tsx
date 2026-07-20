"use client"

import { Button } from "@/components/ui/button"

import type {
  CopilotSkill,
} from "../../copilot/skills"

type CopilotSkillActionsProps = {
  skills: CopilotSkill[]

  onSelectSkill: (
    skill: CopilotSkill
  ) => void
}

export function CopilotSkillActions({
  skills,
  onSelectSkill,
}: CopilotSkillActionsProps) {
  if (skills.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">
        Sugestões
      </h3>

      <div className="flex flex-wrap gap-2">
        {skills.map((skill) => (
          <Button
            key={skill.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onSelectSkill(skill)
            }
          >
            {skill.title}
          </Button>
        ))}
      </div>
    </div>
  )
}
