import {
  CopilotBriefing,
  CopilotConversationPanel,
  getCopilotBriefing,
  getCopilotConversation,
  presentCopilotConversation,
} from "@/features/ai-copilot"

import {
  getGlobalCopilotSkills,
} from "@/features/copilot/skills"

export default async function CopilotPage() {
  const [
    briefing,
    conversation,
  ] = await Promise.all([
    getCopilotBriefing(),
    getCopilotConversation(),
  ])

  const conversationViewModel =
    presentCopilotConversation(
      conversation
    )

  const skills =
    getGlobalCopilotSkills()

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-3xl font-bold">
          AI Copilot
        </h1>

        <p className="mt-2 text-muted-foreground">
          Seu assistente inteligente para gestão de pessoas.
        </p>
      </header>

      <CopilotBriefing
        briefing={briefing}
      />

      <CopilotConversationPanel
        skills={skills}
        initialViewModel={conversationViewModel}
      />
    </div>
  )
}
