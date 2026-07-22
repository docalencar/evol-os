import type {
  ApprovalOutboxRepository,
  ClaimApprovalOutboxEventsInput,
} from "./approval-outbox-repository-contract"

export async function getPendingApprovalOutboxEvents(
  repository: ApprovalOutboxRepository,
  input: ClaimApprovalOutboxEventsInput
) {
  return repository.claimPending(input)
}
