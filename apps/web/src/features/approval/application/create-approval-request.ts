import type {
  CreateApprovalRequestCommand,
} from "../commands"
import {
  ApprovalRequest,
} from "../domain"
import type {
  ApprovalRequestRepository,
} from "../repositories/approval-request-repository-contract"
import type {
  ApprovalRequestApplicationResult,
} from "./approval-application-result"
import {
  failure,
  mapApplicationError,
  persistApprovalRequest,
  validateCommand,
} from "./approval-application-support"
import {
  createApprovalRequestCommandSchema,
} from "./approval-command-schemas"

export class CreateApprovalRequest {
  constructor(
    private readonly repository: ApprovalRequestRepository
  ) {}

  async execute(
    command: CreateApprovalRequestCommand
  ): Promise<ApprovalRequestApplicationResult> {
    const validationError = validateCommand(
      createApprovalRequestCommandSchema,
      command
    )

    if (validationError) {
      return failure(validationError)
    }

    try {
      const approvalRequest = ApprovalRequest.request(command)

      return persistApprovalRequest(
        this.repository,
        approvalRequest,
        0
      )
    } catch (error) {
      return failure(mapApplicationError(error))
    }
  }
}
