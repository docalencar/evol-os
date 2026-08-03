export type DevelopmentPlanPriority = "low" | "medium" | "high"
export type DevelopmentTemplateResolutionScope = "company" | "global"

export type DevelopmentTemplateResolutionErrorCode =
  | "DEVELOPMENT_TEMPLATE_COMPETENCY_UNAVAILABLE"
  | "DEVELOPMENT_TEMPLATE_CONCEPT_VERSION_UNAVAILABLE"
  | "DEVELOPMENT_TEMPLATE_INPUT_INVALID"
  | "DEVELOPMENT_TEMPLATE_MAPPING_AMBIGUOUS"
  | "DEVELOPMENT_TEMPLATE_MAPPING_NOT_ACTIVE"
  | "DEVELOPMENT_TEMPLATE_MAPPING_REQUIRED"
  | "DEVELOPMENT_TEMPLATE_REFERENCE_INVALID"
  | "DEVELOPMENT_TEMPLATE_TARGET_BELOW_CURRENT_LEVEL"
  | "DEVELOPMENT_TEMPLATE_TENANT_MISMATCH"
  | "DEVELOPMENT_TEMPLATE_VERSION_NOT_CONSUMABLE"
  | "DEVELOPMENT_TEMPLATE_WITHOUT_GOALS"

export type DevelopmentTemplateResolutionWarningCode =
  "DEVELOPMENT_TEMPLATE_COMPATIBILITY_APPLIED"

export type DevelopmentTemplateResolutionIssue = Readonly<{
  code: DevelopmentTemplateResolutionErrorCode
  path: string
}>

export type DevelopmentTemplateResolutionWarning = Readonly<{
  code: DevelopmentTemplateResolutionWarningCode
  path: string
  requiredConceptVersionId: string
  mappedConceptVersionId: string
}>

export type TemplateApplicationIdentityInput = Readonly<{
  applicationId: string
  companyId: string
  actorUserId: string
  technicalPrincipal: string
  idempotencyKey: string
  correlationId: string
  effectiveAt: string
}>

export type DevelopmentPlanIntentInput = Readonly<{
  employeeId: string
  ownerId: string | null
  priority: DevelopmentPlanPriority
  startDate: string
  dueDate: string | null
}>

export type DevelopmentTemplateVersionInput = Readonly<{
  id: string
  templateId: string
  companyId: string | null
  scope: DevelopmentTemplateResolutionScope
  versionNumber: number
  status: "draft" | "published" | "obsolete"
  name: string
  description: string | null
  suggestedDurationDays: number | null
}>

export type DevelopmentTemplateVersionGoalInput = Readonly<{
  id: string
  templateVersionId: string
  companyId: string | null
  competencyId: string | null
  globalConceptVersionId: string | null
  description: string | null
  suggestedTargetLevel: number
  orderIndex: number
  createdAt: string
}>

export type DevelopmentTemplateVersionActionInput = Readonly<{
  id: string
  templateVersionGoalId: string
  title: string
  description: string | null
  type: string
  suggestedDueDays: number | null
  orderIndex: number
  createdAt: string
}>

export type OperationalCompetencyInput = Readonly<{
  id: string
  companyId: string
  name: string
  description: string | null
  expectedLevel: number
  active: boolean
}>

export type EmployeeCompetencyLevelInput = Readonly<{
  competencyId: string
  currentLevel: number
  active: boolean
}>

export type GlobalCompetencyConceptVersionInput = Readonly<{
  id: string
  conceptId: string
  conceptCode: string
  versionNumber: number
  name: string
  definition: string
  category: string
  status: "draft" | "published" | "deprecated"
}>

export type TenantCompetencyMappingInput = Readonly<{
  id: string
  companyId: string
  conceptVersionId: string
  competencyId: string
  status: "proposed" | "confirmed" | "rejected" | "inactive"
  confirmedBy: string | null
  confirmedAt: string | null
}>

export type ConceptVersionCompatibilityInput = Readonly<{
  id: string
  requiredVersionId: string
  compatibleVersionId: string
}>

export type DevelopmentTemplateApplicationResolutionInput = Readonly<{
  identity: TemplateApplicationIdentityInput
  intent: DevelopmentPlanIntentInput
  templateVersion: DevelopmentTemplateVersionInput
  goals: readonly DevelopmentTemplateVersionGoalInput[]
  actions: readonly DevelopmentTemplateVersionActionInput[]
  operationalCompetencies: readonly OperationalCompetencyInput[]
  employeeCompetencyLevels: readonly EmployeeCompetencyLevelInput[]
  globalConceptVersions: readonly GlobalCompetencyConceptVersionInput[]
  tenantMappings: readonly TenantCompetencyMappingInput[]
  compatibilities: readonly ConceptVersionCompatibilityInput[]
}>

export type ResolvedDevelopmentTemplateAction = Readonly<{
  sourceActionId: string
  title: string
  description: string | null
  type: string
  suggestedDueDays: number | null
  dueDate: string | null
  orderIndex: number
}>

export type AppliedConceptCompatibility = Readonly<{
  declarationId: string
  requiredConceptVersionId: string
  mappedConceptVersionId: string
}>

export type ResolvedGlobalCompetency = Readonly<{
  conceptId: string
  conceptCode: string
  requiredVersionId: string
  requiredVersionNumber: number
  requiredName: string
  requiredDefinition: string
  requiredCategory: string
  mappingId: string
  mappedConceptVersionId: string
  confirmedBy: string
  confirmedAt: string
  compatibility: AppliedConceptCompatibility | null
}>

export type ResolvedOperationalCompetency = Readonly<{
  id: string
  companyId: string
  name: string
  description: string | null
  expectedLevel: number
}>

export type ResolvedDevelopmentTemplateGoal = Readonly<{
  sourceGoalId: string
  description: string | null
  orderIndex: number
  suggestedTargetLevel: number
  currentLevel: number
  expectedLevel: number
  appliedTargetLevel: number
  competency: ResolvedOperationalCompetency
  globalCompetency: ResolvedGlobalCompetency | null
  actions: readonly ResolvedDevelopmentTemplateAction[]
}>

export type DevelopmentTemplateApplicationSnapshotLogical = Readonly<{
  formatVersion: 1
  application: Readonly<{
    id: string
    companyId: string
    actorUserId: string
    technicalPrincipal: string
    idempotencyKey: string
    correlationId: string
    effectiveAt: string
  }>
  template: Readonly<{
    id: string
    versionId: string
    versionNumber: number
    scope: DevelopmentTemplateResolutionScope
    companyId: string | null
    name: string
    description: string | null
    suggestedDurationDays: number | null
  }>
  plan: Readonly<{
    employeeId: string
    ownerId: string | null
    priority: DevelopmentPlanPriority
    startDate: string
    dueDate: string | null
  }>
  goals: readonly ResolvedDevelopmentTemplateGoal[]
}>

export type DevelopmentTemplateApplicationLineageLogical = Readonly<{
  applicationId: string
  companyId: string
  templateId: string
  templateVersionId: string
  templateVersionNumber: number
  scope: DevelopmentTemplateResolutionScope
  snapshotFormatVersion: 1
  intentFingerprint: string
}>

export type DevelopmentTemplateResolutionMetadata = Readonly<{
  resolverVersion: 1
  effectiveAt: string
  idempotencyKey: string
  correlationId: string
  actorUserId: string
  technicalPrincipal: string
}>

export type DevelopmentTemplateApplicationResolution = Readonly<{
  fingerprint: string
  snapshot: DevelopmentTemplateApplicationSnapshotLogical
  lineage: DevelopmentTemplateApplicationLineageLogical
  metadata: DevelopmentTemplateResolutionMetadata
  goals: readonly ResolvedDevelopmentTemplateGoal[]
  warnings: readonly DevelopmentTemplateResolutionWarning[]
}>

export type DevelopmentTemplateApplicationResolutionResult =
  | Readonly<{
      ok: true
      resolution: DevelopmentTemplateApplicationResolution
    }>
  | Readonly<{
      ok: false
      errors: readonly DevelopmentTemplateResolutionIssue[]
      warnings: readonly DevelopmentTemplateResolutionWarning[]
    }>
