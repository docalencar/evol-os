export type DevelopmentTemplateScope = "global" | "company"

export type DevelopmentTemplateVersionStatus =
  | "draft"
  | "published"
  | "obsolete"

export type DevelopmentTemplateApplicationStatus =
  | "pending"
  | "succeeded"
  | "failed"

export type DevelopmentTemplateApplicationAttemptStatus =
  | "running"
  | "succeeded"
  | "failed"
  | "interrupted"

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonArray
export type JsonObject = Readonly<{ [key: string]: JsonValue }>
export type JsonArray = readonly JsonValue[]

export type DevelopmentTemplateVersion = Readonly<{
  id: string
  templateId: string
  companyId: string | null
  scope: DevelopmentTemplateScope
  versionNumber: number
  status: DevelopmentTemplateVersionStatus
  name: string
  description: string | null
  suggestedDurationDays: number | null
  createdBy: string
  createdAt: string
  publishedBy: string | null
  publishedAt: string | null
  obsoletedBy: string | null
  obsoletedAt: string | null
}>

export type DevelopmentTemplateVersionGoal = Readonly<{
  id: string
  templateVersionId: string
  sourceGoalId: string | null
  companyId: string | null
  competencyId: string | null
  globalConceptVersionId: string | null
  description: string | null
  suggestedTargetLevel: number
  orderIndex: number
}>

export type DevelopmentTemplateVersionAction = Readonly<{
  id: string
  templateVersionGoalId: string
  sourceActionId: string | null
  title: string
  description: string | null
  type: string
  suggestedDueDays: number | null
  orderIndex: number
}>

export type DevelopmentTemplateApplication = Readonly<{
  id: string
  companyId: string
  templateVersionId: string
  actorUserId: string
  technicalPrincipal: string
  idempotencyKey: string
  intentFingerprint: string
  correlationId: string
  status: DevelopmentTemplateApplicationStatus
  resultPlanId: string | null
  failureCode: string | null
  requestedAt: string
  completedAt: string | null
}>

export type DevelopmentTemplateApplicationAttempt = Readonly<{
  id: string
  applicationId: string
  companyId: string
  attemptNumber: number
  status: DevelopmentTemplateApplicationAttemptStatus
  errorCode: string | null
  startedAt: string
  completedAt: string | null
}>

export type DevelopmentTemplateApplicationSnapshot = Readonly<{
  id: string
  applicationId: string
  companyId: string
  planId: string
  formatVersion: number
  snapshot: JsonObject
  createdAt: string
}>

export type DevelopmentTemplateApplicationLineage = Readonly<{
  id: string
  applicationId: string
  snapshotId: string
  planId: string
  templateVersionId: string
  companyId: string
  createdAt: string
}>
