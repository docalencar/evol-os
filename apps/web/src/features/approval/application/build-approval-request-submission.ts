import type {
  CreateApprovalRequestCommand,
} from "../commands"
import {
  ApprovalRequest,
} from "../domain"
import {
  mapApprovalDomainEventsToPersistence,
  mapApprovalRequestToPersistence,
} from "../mappers"
import type {
  ApprovalApplicationResult,
} from "./approval-application-result"
import {
  failure,
  mapApplicationError,
  validateCommand,
} from "./approval-application-support"
import {
  createApprovalRequestCommandSchema,
} from "./approval-command-schemas"

// Serialized persistence payload for a brand-new approval request, produced by
// the SAME domain construction (ApprovalRequest.request) and serializers the
// framework's repository uses. Consumers persist it through their own trusted
// boundary without reimplementing the event-sourced aggregate.
export type ApprovalRequestSubmissionPayload = {
  aggregate: ReturnType<typeof mapApprovalRequestToPersistence>
  events: ReturnType<typeof mapApprovalDomainEventsToPersistence>
}

export function buildApprovalRequestSubmission(
  command: CreateApprovalRequestCommand
): ApprovalApplicationResult<ApprovalRequestSubmissionPayload> {
  const validationError = validateCommand(
    createApprovalRequestCommandSchema,
    command
  )

  if (validationError) {
    return failure(validationError)
  }

  try {
    const approvalRequest = ApprovalRequest.request(command)

    return {
      success: true,
      data: {
        aggregate:
          mapApprovalRequestToPersistence(approvalRequest),
        events: mapApprovalDomainEventsToPersistence(
          approvalRequest.getPendingDomainEvents()
        ),
      },
    }
  } catch (error) {
    return failure(mapApplicationError(error))
  }
}
