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
} from "../../actions"

import type {
  CopilotConversationViewModel,
  CopilotMessageViewModel,
} from "../../view-models/copilot-conversation-view-model"

import {
  CopilotSkillActions,
} from "../copilot-skill-actions"

import {
  CopilotChat,
} from "./copilot-chat"

import {
  CopilotPrompt,
} from "./copilot-prompt"

type CopilotConversationPanelProps = {
  skills: CopilotSkill[]
  initialViewModel: CopilotConversationViewModel
}

type ExecuteConversationInput = {
  skill: CopilotSkill
  prompt: string
}

function createMessage({
  role,
  content,
  status,
}: {
  role: "user" | "assistant"
  content: string
  status: "pending" | "completed" | "failed"
}): CopilotMessageViewModel {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    status,
    createdAt: new Date().toISOString(),
  }
}

export function CopilotConversationPanel({
  skills,
  initialViewModel,
}: CopilotConversationPanelProps) {
  const [
    viewModel,
    setViewModel,
  ] = useState<CopilotConversationViewModel>(
    initialViewModel
  )

  const [
    isPending,
    startTransition,
  ] = useTransition()

  function executeConversation({
    skill,
    prompt,
  }: ExecuteConversationInput) {
    if (isPending) {
      return
    }

    const normalizedPrompt =
      prompt.trim()

    if (normalizedPrompt.length === 0) {
      return
    }

    const userMessage =
      createMessage({
        role: "user",
        content: normalizedPrompt,
        status: "completed",
      })

    const assistantMessage =
      createMessage({
        role: "assistant",
        content:
          "O Evol AI está processando a solicitação...",
        status: "pending",
      })

    setViewModel((current) => ({
      ...current,
      status: "processing",
      messages: [
        ...current.messages,
        userMessage,
        assistantMessage,
      ],
    }))

    startTransition(async () => {
      const result =
        await executeGlobalCopilotSkillAction({
          skill,
          prompt: normalizedPrompt,
        })

      setViewModel((current) => ({
        ...current,
        status:
          result.success
            ? "completed"
            : "failed",
        messages: current.messages.map(
          (message) => {
            if (
              message.id !==
              assistantMessage.id
            ) {
              return message
            }

            if (!result.success) {
              return {
                ...message,
                content: result.message,
                status: "failed",
              }
            }

            return {
              ...message,
              content: result.content,
              status: "completed",
            }
          }
        ),
      }))
    })
  }

  function handleSelectSkill(
    skill: CopilotSkill
  ) {
    const prompt =
      skill.suggestedPrompts[0] ??
      skill.title

    executeConversation({
      skill,
      prompt,
    })
  }

  function handleSubmitPrompt(
    prompt: string
  ) {
    const defaultSkill =
      skills.find(
        (skill) =>
          skill.id ===
          "executive-summary"
      ) ?? skills[0]

    if (!defaultSkill) {
      return
    }

    executeConversation({
      skill: defaultSkill,
      prompt,
    })
  }

  return (
    <div className="space-y-8">
      <CopilotSkillActions
        skills={skills}
        onSelectSkill={handleSelectSkill}
      />

      <CopilotChat
        viewModel={viewModel}
      />

      <CopilotPrompt
        isPending={isPending}
        onSubmit={handleSubmitPrompt}
      />
    </div>
  )
}
