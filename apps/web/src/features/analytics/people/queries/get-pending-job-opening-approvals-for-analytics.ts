import "server-only"

import { getApprovalRequests } from "@/features/approval"

export function getPendingJobOpeningApprovalsForAnalytics(
  companyId: string
) {
  return getApprovalRequests({
    companyId,
    status: "pending",
    module: "recruitment",
    entityType: "job_opening",
  })
}
