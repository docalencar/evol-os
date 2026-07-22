import type { WithdrawRequestCommand } from "../commands"
import type { ApprovalRequestRepository } from "../repositories/approval-request-repository-contract"
import type { ApprovalRequestApplicationResult } from "./approval-application-result"
import {
  failure,
  loadApprovalRequest,
  mapApplicationError,
  persistApprovalRequest,
  validateCommand,
} from "./approval-application-support"
import { withdrawRequestCommandSchema } from "./approval-command-schemas"

export class WithdrawRequest {
  constructor(
    private readonly repository: ApprovalRequestRepository
  ) {}

  async execute(
    command: WithdrawRequestCommand
  ): Promise<ApprovalRequestApplicationResult> {
    const validationError = validateCommand(
      withdrawRequestCommandSchema,
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
      loaded.approvalRequest.withdraw({
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
