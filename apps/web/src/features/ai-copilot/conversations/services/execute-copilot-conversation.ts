import {
  createSupabaseCopilotConversationRepository,
  createSupabaseCopilotMessageRepository,
} from "../repositories"

import type {
  CopilotConversationContextType,
} from "../types"

import type {
  CopilotConversationDetailViewModel,
} from "../view-models"

export type ExecuteCopilotConversationInput = {
  companyId: string
  prompt: string
  conversationId?: string
  contextType?: CopilotConversationContextType
  contextId?: string | null
}

export async function executeCopilotConversation(
  input: ExecuteCopilotConversationInput
): Promise<CopilotConversationDetailViewModel> {
  const repository =
    await createSupabaseCopilotConversationRepository()

  const conversation =
    input.conversationId
      ? await repository.findById({
        companyId: input.companyId,
        conversationId: input.conversationId,
      })
      : await repository.create({
          companyId: input.companyId,
          title: input.prompt.slice(0, 80),
          contextType: input.contextType,
          contextId: input.contextId ?? null,
        })

  if (!conversation) {
    throw new Error("Conversation not found.")
  }

  const messageRepository =
    await createSupabaseCopilotMessageRepository()

  await messageRepository.append({
    conversationId:
      "conversation" in conversation
        ? conversation.conversation.id
        : conversation.id,
    role: "user",
    content: input.prompt,
  })

  throw new Error(
    "PR-123C concluída: mensagem do usuário persistida. Próxima PR integrará o provider de IA."
  )
}
