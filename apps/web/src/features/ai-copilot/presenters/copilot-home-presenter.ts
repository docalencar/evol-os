import type { CopilotHomeData } from "../types/copilot-home"
import type { CopilotHomeViewModel } from "../view-models/copilot-home-view-model"

export function presentCopilotHome(
  home: CopilotHomeData
): CopilotHomeViewModel {
  return {
    suggestions: home.suggestions,
  }
}
