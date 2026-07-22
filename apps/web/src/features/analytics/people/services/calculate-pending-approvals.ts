import type {
  ApprovalRequestStatus,
} from "../../../approval/domain/types/approval-status"

type ApprovalStatusInput = {
  status: ApprovalRequestStatus
}

export function calculatePendingApprovals(
  approvalRequests: readonly ApprovalStatusInput[]
) {
  return approvalRequests.filter(
    (request) => request.status === "pending"
  ).length
}
