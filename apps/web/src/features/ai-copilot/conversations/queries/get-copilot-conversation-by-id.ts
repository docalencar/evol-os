import type {
  CopilotConversationRepository,
  FindCopilotConversationByIdInput,
} from "../repositories"

import type {
  CopilotConversationWithMessages,
} from "../types"

type GetCopilotConversationByIdDependencies = {
  repository: CopilotConversationRepository
}

export async function getCopilotConversationById(
  dependencies: GetCopilotConversationByIdDependencies,
  input: FindCopilotConversationByIdInput
): Promise<CopilotConversationWithMessages | null> {
  return dependencies.repository.findById(input)
}
