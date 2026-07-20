import { createServerDatabase } from "@/lib/database/server-database"

import type {
  AppendCopilotMessageInput,
  CopilotMessageRepository,
} from "./copilot-message-repository"

import type {
  CopilotConversationMessage,
  CopilotConversationMessageMetadata,
  CopilotConversationMessageRole,
  CopilotConversationMessageStatus,
} from "../types"

type CopilotConversationMessageRow = {
  id: string
  conversation_id: string
  role: CopilotConversationMessageRole
  content: string
  status: CopilotConversationMessageStatus
  metadata: CopilotConversationMessageMetadata | null
  input_tokens: number | null
  output_tokens: number | null
  created_at: string
}

function mapMessageRow(
  row: CopilotConversationMessageRow
): CopilotConversationMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    status: row.status,
    metadata: row.metadata ?? {},
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    createdAt: row.created_at,
  }
}

export async function createSupabaseCopilotMessageRepository(): Promise<
  CopilotMessageRepository
> {
  const supabase = await createServerDatabase()

  return {
    async append(
      input: AppendCopilotMessageInput
    ): Promise<CopilotConversationMessage> {
      const content = input.content.trim()

      if (!content) {
        throw new Error(
          "O conteúdo da mensagem do Copilot não pode estar vazio."
        )
      }

      const {
        data,
        error,
      } = await supabase
        .from("copilot_conversation_messages")
        .insert({
          conversation_id: input.conversationId,
          role: input.role,
          content,
          status: input.status ?? "completed",
          metadata: input.metadata ?? {},
          input_tokens: input.inputTokens ?? null,
          output_tokens: input.outputTokens ?? null,
        })
        .select(
          [
            "id",
            "conversation_id",
            "role",
            "content",
            "status",
            "metadata",
            "input_tokens",
            "output_tokens",
            "created_at",
          ].join(",")
        )
        .single()

      if (error) {
        throw new Error(
          `Não foi possível adicionar a mensagem do Copilot: ${error.message}`
        )
      }

      const row =
        data as unknown as CopilotConversationMessageRow

      return mapMessageRow(row)
    },
  }
}
