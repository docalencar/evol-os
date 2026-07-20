import type {
  ExecutiveAiContext,
} from "./executive-ai-context"

export type ExecutiveCopilotUserContext = {
  userId: string | null
  role: string | null
  permissions: string[]
}

export type ExecutiveCopilotNavigationContext = {
  pathname: string
  section: string | null
}

export type ExecutiveCopilotTemporalContext = {
  generatedAt: string
  locale: string
  timeZone: string
}

export type ExecutiveCopilotExtensions =
  Record<string, unknown>

export type ExecutiveCopilotContext = {
  companyId: string

  entity: ExecutiveAiContext

  user: ExecutiveCopilotUserContext

  navigation:
    ExecutiveCopilotNavigationContext

  temporal:
    ExecutiveCopilotTemporalContext

  extensions:
    ExecutiveCopilotExtensions
}
