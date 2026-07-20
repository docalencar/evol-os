import type {
  ExecutiveCopilotContext,
} from "./executive-copilot-context"

import type {
  GlobalCopilotContext,
} from "./global-copilot-context"

export type CopilotContext =
  | ExecutiveCopilotContext
  | GlobalCopilotContext
