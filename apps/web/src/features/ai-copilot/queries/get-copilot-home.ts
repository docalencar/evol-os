import type { CopilotHomeData } from "../types/copilot-home"

export async function getCopilotHome(): Promise<CopilotHomeData> {
  return {
    suggestions: 0,
  }
}
