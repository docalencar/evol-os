"use client"

import {
  useState,
  useTransition,
} from "react"

import type {
  CopilotSkill,
} from "@/features/copilot/skills"

import {
  executeGlobalCopilotSkillAction,
} from "../actions"

import {
  CopilotSkillActions,
} from "./copilot-skill-actions"

type CopilotSkillPanelProps = {
  skills: CopilotSkill[]
}

export function CopilotSkillPanel({
  skills,
}: CopilotSkillPanelProps) {
  const [
    content,
    setContent,
  ] = useState<string | null>(null)

  const [
    error,
    setError,
  ] = useState<string | null>(null)

  const [
    isPending,
    startTransition,
  ] = useTransition()

  function handleSelectSkill(
    skill: CopilotSkill
  ) {
    setError(null)
    setContent(null)

    startTransition(async () => {
      const result =
        await executeGlobalCopilotSkillAction({
          skill,
        })

      if (!result.success) {
        setError(result.message)
        return
      }

      setContent(result.content)
    })
  }

  return (
    <section className="space-y-4">
      <CopilotSkillActions
        skills={skills}
        onSelectSkill={handleSelectSkill}
      />

      {isPending ? (
        <div className="rounded-2xl border bg-muted/20 p-5">
          <p className="text-sm text-muted-foreground">
            O Evol AI está processando a solicitação...
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
          <p className="text-sm text-destructive">
            {error}
          </p>
        </div>
      ) : null}

      {content ? (
        <div className="rounded-2xl border bg-muted/20 p-5">
          <p className="text-sm font-medium">
            Resposta do Evol AI
          </p>

          <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
            {content}
          </p>
        </div>
      ) : null}
    </section>
  )
}
