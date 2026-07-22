import type { CancelRequestCommand } from "../commands"
import type { ApprovalRequestRepository } from "../repositories/approval-request-repository-contract"
import type { ApprovalRequestApplicationResult } from "./approval-application-result"
import {
  failure,
  loadApprovalRequest,
  mapApplicationError,
  persistApprovalRequest,
  validateCommand,
} from "./approval-application-support"
import { cancelRequestCommandSchema } from "./approval-command-schemas"

export class CancelRequest {
  constructor(
    private readonly repository: ApprovalRequestRepository
  ) {}

  async execute(
    command: CancelRequestCommand
  ): Promise<ApprovalRequestApplicationResult> {
    const validationError = validateCommand(
      cancelRequestCommandSchema,
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
      loaded.approvalRequest.cancel({
        actor: command.actor,
        reason: command.reason,
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
