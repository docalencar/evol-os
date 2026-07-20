import type {
  ExecutiveAiContext,
  ExecutiveCopilotContext,
  ExecutiveCopilotExtensions,
  ExecutiveCopilotNavigationContext,
  ExecutiveCopilotUserContext,
} from "../types"

export type CreateExecutiveCopilotContextInput = {
  entity: ExecutiveAiContext

  user?: Partial<
    ExecutiveCopilotUserContext
  >

  navigation:
    ExecutiveCopilotNavigationContext

  generatedAt?: string

  locale?: string

  timeZone?: string

  extensions?: ExecutiveCopilotExtensions
}

export function createExecutiveCopilotContext({
  entity,
  user = {},
  navigation,
  generatedAt =
    new Date().toISOString(),
  locale = "pt-BR",
  timeZone = "UTC",
  extensions = {},
}: CreateExecutiveCopilotContextInput): ExecutiveCopilotContext {
  return {
    companyId: entity.companyId,

    entity,

    user: {
      userId:
        user.userId ?? null,

      role:
        user.role ?? null,

      permissions:
        user.permissions ?? [],
    },

    navigation,

    temporal: {
      generatedAt,
      locale,
      timeZone,
    },

    extensions,
  }
}
