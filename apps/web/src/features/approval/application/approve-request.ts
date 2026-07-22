import type { ApproveRequestCommand } from "../commands"
import type { ApprovalRequestRepository } from "../repositories/approval-request-repository-contract"
import type { ApprovalRequestApplicationResult } from "./approval-application-result"
import {
  failure,
  loadApprovalRequest,
  mapApplicationError,
  persistApprovalRequest,
  validateCommand,
} from "./approval-application-support"
import { approveRequestCommandSchema } from "./approval-command-schemas"

export class ApproveRequest {
  constructor(
    private readonly repository: ApprovalRequestRepository
  ) {}

  async execute(
    command: ApproveRequestCommand
  ): Promise<ApprovalRequestApplicationResult> {
    const validationError = validateCommand(
      approveRequestCommandSchema,
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
      loaded.approvalRequest.decide({
        decisionId: command.decisionId,
        assignmentId: command.assignmentId,
        actor: command.actor,
        outcome: "approved",
        decidedAt: command.occurredAt,
        subjectVersion: command.subjectVersion,
        expectedVersion: command.expectedVersion,
        idempotencyKey: command.idempotencyKey,
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
