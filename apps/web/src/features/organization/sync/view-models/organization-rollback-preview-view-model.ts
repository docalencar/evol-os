export type OrganizationRollbackPreviewStatus =
  | "available"
  | "partial"
  | "unavailable"

export type OrganizationRollbackPreviewTone =
  | "success"
  | "warning"
  | "danger"

export type OrganizationRollbackPreviewMetricViewModel = {
  key: string
  label: string
  value: number
  description: string
}

export type OrganizationRollbackPreviewItemViewModel = {
  key: string
  entityId: string
  entityLabel: string
  sourceOperationLabel: string
  rollbackOperationLabel: string
  status: "ready" | "unsupported"
  statusLabel: string
  message: string | null
}

export type OrganizationRollbackPreviewViewModel = {
  status: OrganizationRollbackPreviewStatus
  tone: OrganizationRollbackPreviewTone
  title: string
  description: string
  canRollback: boolean
  generatedAtLabel: string
  metrics: OrganizationRollbackPreviewMetricViewModel[]
  items: OrganizationRollbackPreviewItemViewModel[]
}
