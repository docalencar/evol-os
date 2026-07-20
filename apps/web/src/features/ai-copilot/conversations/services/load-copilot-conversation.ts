import {
  createSupabaseCopilotConversationRepository,
} from "../repositories"

import {
  getCopilotConversationById,
} from "../queries"

import {
  presentCopilotConversation,
} from "../presenters"

import type {
  CopilotConversationDetailViewModel,
} from "../view-models"

export type LoadCopilotConversationInput = {
  companyId: string
  conversationId: string
}

export async function loadCopilotConversation(
  input: LoadCopilotConversationInput
): Promise<CopilotConversationDetailViewModel | null> {
  const repository =
    await createSupabaseCopilotConversationRepository()

  const conversation =
    await getCopilotConversationById(
      {
        repository,
      },
      input
    )

  if (!conversation) {
    return null
  }

  return presentCopilotConversation(
    conversation
  )
}
