import type {
  GlobalCopilotContext,
} from "../types/global-copilot-context"

export type CreateGlobalCopilotContextInput = {
  companyId: string

  user?: Partial<
    GlobalCopilotContext["user"]
  >

  locale?: string

  timeZone?: string

  generatedAt?: string

  metadata?: Record<string, unknown>
}

export function createGlobalCopilotContext({
  companyId,
  user = {},
  locale = "pt-BR",
  timeZone = "UTC",
  generatedAt = new Date().toISOString(),
  metadata = {},
}: CreateGlobalCopilotContextInput): GlobalCopilotContext {
  return {
    companyId,

    generatedAt,

    locale,

    timeZone,

    metadata,

    user: {
      userId:
        user.userId ?? null,

      role:
        user.role ?? null,

      permissions:
        user.permissions ?? [],
    },
  }
}
