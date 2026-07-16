import type {
  OrganizationExecutionReport,
} from "../types/organization-execution-report"
import type {
  ApplyOrganizationSyncPlanActionResult,
} from "../view-models/apply-organization-sync-action-result"

function formatAppliedItemsMessage(
  appliedItems: number
) {
  if (appliedItems === 1) {
    return "1 item aplicado"
  }

  return `${appliedItems} itens aplicados`
}

export function presentApplyOrganizationSyncResult(
  report: OrganizationExecutionReport
): ApplyOrganizationSyncPlanActionResult {
  const success = report.failedItems === 0

  const totalItems =
    report.appliedItems +
    report.skippedItems +
    report.failedItems

  const appliedItemsMessage =
    formatAppliedItemsMessage(
      report.appliedItems
    )

  return {
    success,
    message: success
      ? `${appliedItemsMessage} com sucesso.`
      : `${appliedItemsMessage} e ${report.failedItems} ${
          report.failedItems === 1
            ? "item com erro"
            : "itens com erro"
        }.`,
    totalItems,
    appliedItems: report.appliedItems,
    skippedItems: report.skippedItems,
    failedItems: report.failedItems,
    errors: report.errors,
  }
}
