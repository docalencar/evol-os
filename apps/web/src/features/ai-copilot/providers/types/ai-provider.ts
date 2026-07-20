import type {
  AiRequest,
} from "./ai-request"

import type {
  AiResponse,
} from "./ai-response"

export interface AiProvider {
  execute(
    request: AiRequest
  ): Promise<AiResponse>
}
