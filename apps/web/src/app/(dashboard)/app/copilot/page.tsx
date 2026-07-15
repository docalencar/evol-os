import {
  CopilotBriefing,
  CopilotHome,
  getCopilotBriefing,
  getCopilotHome,
  presentCopilotHome,
} from "@/features/ai-copilot"

export default async function CopilotPage() {
  const home =
    await getCopilotHome()

  const briefing =
    await getCopilotBriefing()

  const viewModel =
    presentCopilotHome(home)

  return (
    <div className="space-y-10">
      <CopilotBriefing
        briefing={briefing}
      />

      <CopilotHome
        viewModel={viewModel}
      />
    </div>
  )
}
