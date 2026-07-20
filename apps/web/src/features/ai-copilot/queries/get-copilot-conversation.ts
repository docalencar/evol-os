import type {
  CopilotConversation,
} from "../types/copilot-conversation"

export async function getCopilotConversation(): Promise<CopilotConversation> {
  return {
    id: "default",
    title: "Nova conversa",
    status: "idle",

    context: {
      entityType: null,
      entityId: null,
      entityTitle: null,
    },

    messages: [
      {
        id: "welcome",
        role: "assistant",
        content:
          "Olá! Sou o AI Copilot do Evol OS. Posso ajudar com indicadores, pessoas, departamentos, cargos e análises organizacionais.",
        status: "completed",
        sources: [],
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ],

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
