import type { ExpireRequestCommand } from "../commands"
import type { ApprovalRequestRepository } from "../repositories/approval-request-repository-contract"
import type { ApprovalRequestApplicationResult } from "./approval-application-result"
import {
  failure,
  loadApprovalRequest,
  mapApplicationError,
  persistApprovalRequest,
  validateCommand,
} from "./approval-application-support"
import { expireRequestCommandSchema } from "./approval-command-schemas"

export class ExpireRequest {
  constructor(
    private readonly repository: ApprovalRequestRepository
  ) {}

  async execute(
    command: ExpireRequestCommand
  ): Promise<ApprovalRequestApplicationResult> {
    const validationError = validateCommand(
      expireRequestCommandSchema,
      command
    )

    if (validationError) {
      return failure(validationError)
    }

    const loaded = await loadApprovalRequest(
      this.repository,
      command.companyId,
      command.approvalRequestId
    )

    if (loaded.error) {
      return failure(loaded.error)
    }

    try {
      loaded.approvalRequest.expire({
        actor: command.actor,
        occurredAt: command.occurredAt,
        expectedVersion: command.expectedVersion,
      })

      return persistApprovalRequest(
        this.repository,
        loaded.approvalRequest,
        command.expectedVersion
      )
    } catch (error) {
      return failure(mapApplicationError(error))
    }
  }
}
