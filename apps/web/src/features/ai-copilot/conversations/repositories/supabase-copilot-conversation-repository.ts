import { createServerDatabase } from "@/lib/database/server-database"

import type {
  CopilotConversationRepository,
  CreateCopilotConversationInput,
  FindCopilotConversationByIdInput,
} from "./copilot-conversation-repository"

import type {
  CopilotConversation,
  CopilotConversationContextType,
  CopilotConversationMessage,
  CopilotConversationMessageMetadata,
  CopilotConversationMessageRole,
  CopilotConversationMessageStatus,
  CopilotConversationStatus,
  CopilotConversationWithMessages,
} from "../types"

type CopilotConversationRow = {
  id: string
  company_id: string
  created_by: string
  title: string
  context_type: CopilotConversationContextType
  context_id: string | null
  status: CopilotConversationStatus
  created_at: string
  updated_at: string
}

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

function mapConversationRow(
  row: CopilotConversationRow
): CopilotConversation {
  return {
    id: row.id,
    companyId: row.company_id,
    createdBy: row.created_by,
    title: row.title,
    contextType: row.context_type,
    contextId: row.context_id,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
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

export async function createSupabaseCopilotConversationRepository(): Promise<
  CopilotConversationRepository
> {
  const supabase = await createServerDatabase()

  return {
    async create(
      input: CreateCopilotConversationInput
    ): Promise<CopilotConversation> {
      const {
        data,
        error,
      } = await supabase
        .from("copilot_conversations")
        .insert({
          company_id: input.companyId,
          title: input.title?.trim() || "Nova conversa",
          context_type: input.contextType ?? "global",
          context_id: input.contextId ?? null,
        })
        .select(
          [
            "id",
            "company_id",
            "created_by",
            "title",
            "context_type",
            "context_id",
            "status",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .single()

      if (error) {
        throw new Error(
          `Não foi possível criar a conversa do Copilot: ${error.message}`
        )
      }

      const row =
        data as unknown as CopilotConversationRow

      return mapConversationRow(row)
    },

    async findById(
      input: FindCopilotConversationByIdInput
    ): Promise<CopilotConversationWithMessages | null> {
      const {
        data: conversationData,
        error: conversationError,
      } = await supabase
        .from("copilot_conversations")
        .select(
          [
            "id",
            "company_id",
            "created_by",
            "title",
            "context_type",
            "context_id",
            "status",
            "created_at",
            "updated_at",
          ].join(",")
        )
        .eq("company_id", input.companyId)
        .eq("id", input.conversationId)
        .maybeSingle()

      if (conversationError) {
        throw new Error(
          `Não foi possível carregar a conversa do Copilot: ${conversationError.message}`
        )
      }

      if (!conversationData) {
        return null
      }

      const {
        data: messagesData,
        error: messagesError,
      } = await supabase
        .from("copilot_conversation_messages")
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
        .eq("conversation_id", input.conversationId)
        .order("created_at", {
          ascending: true,
        })
        .order("id", {
          ascending: true,
        })

      if (messagesError) {
        throw new Error(
          `Não foi possível carregar as mensagens do Copilot: ${messagesError.message}`
        )
      }

      const conversationRow =
        conversationData as unknown as CopilotConversationRow

      const messageRows =
        (messagesData ?? []) as unknown as CopilotConversationMessageRow[]

      return {
        conversation: mapConversationRow(conversationRow),
        messages: messageRows.map(mapMessageRow),
      }
    },
  }
}
