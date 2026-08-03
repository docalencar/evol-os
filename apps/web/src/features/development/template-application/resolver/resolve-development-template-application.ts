import { createCanonicalFingerprint } from "./canonical-json"
import type {
  AppliedConceptCompatibility,
  ConceptVersionCompatibilityInput,
  DevelopmentTemplateApplicationResolutionInput,
  DevelopmentTemplateApplicationResolutionResult,
  DevelopmentTemplateResolutionIssue,
  DevelopmentTemplateResolutionWarning,
  DevelopmentTemplateVersionActionInput,
  DevelopmentTemplateVersionGoalInput,
  GlobalCompetencyConceptVersionInput,
  OperationalCompetencyInput,
  ResolvedDevelopmentTemplateAction,
  ResolvedDevelopmentTemplateGoal,
  ResolvedGlobalCompetency,
  TenantCompetencyMappingInput,
} from "./types"

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function compareOrdered(
  left: Readonly<{ orderIndex: number; createdAt: string; id: string }>,
  right: Readonly<{ orderIndex: number; createdAt: string; id: string }>,
): number {
  return (
    left.orderIndex - right.orderIndex ||
    compareText(left.createdAt, right.createdAt) ||
    compareText(left.id, right.id)
  )
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child)
    }
    Object.freeze(value)
  }
  return value
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0
}

function isValidDate(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

function isValidInstant(value: string): boolean {
  return isNonEmpty(value) && !Number.isNaN(Date.parse(value))
}

function addDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`)
  parsed.setUTCDate(parsed.getUTCDate() + days)
  return parsed.toISOString().slice(0, 10)
}

function issue(
  code: DevelopmentTemplateResolutionIssue["code"],
  path: string,
): DevelopmentTemplateResolutionIssue {
  return { code, path }
}

function sortIssues(
  issues: readonly DevelopmentTemplateResolutionIssue[],
): readonly DevelopmentTemplateResolutionIssue[] {
  return [...issues].sort(
    (left, right) =>
      compareText(left.code, right.code) || compareText(left.path, right.path),
  )
}

function sortWarnings(
  warnings: readonly DevelopmentTemplateResolutionWarning[],
): readonly DevelopmentTemplateResolutionWarning[] {
  return [...warnings].sort(
    (left, right) =>
      compareText(left.code, right.code) || compareText(left.path, right.path),
  )
}

function validateIdentityAndIntent(
  input: DevelopmentTemplateApplicationResolutionInput,
): DevelopmentTemplateResolutionIssue[] {
  const errors: DevelopmentTemplateResolutionIssue[] = []
  const requiredIdentity: readonly [string, string][] = [
    ["identity.applicationId", input.identity.applicationId],
    ["identity.companyId", input.identity.companyId],
    ["identity.actorUserId", input.identity.actorUserId],
    ["identity.technicalPrincipal", input.identity.technicalPrincipal],
    ["identity.idempotencyKey", input.identity.idempotencyKey],
    ["identity.correlationId", input.identity.correlationId],
    ["intent.employeeId", input.intent.employeeId],
  ]

  for (const [path, value] of requiredIdentity) {
    if (!isNonEmpty(value)) {
      errors.push(issue("DEVELOPMENT_TEMPLATE_INPUT_INVALID", path))
    }
  }

  if (!isValidInstant(input.identity.effectiveAt)) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_INPUT_INVALID", "identity.effectiveAt"))
  }
  if (!isValidDate(input.intent.startDate)) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_INPUT_INVALID", "intent.startDate"))
  }
  if (input.intent.dueDate !== null && !isValidDate(input.intent.dueDate)) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_INPUT_INVALID", "intent.dueDate"))
  }
  if (
    input.intent.dueDate !== null &&
    isValidDate(input.intent.startDate) &&
    isValidDate(input.intent.dueDate) &&
    input.intent.dueDate < input.intent.startDate
  ) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_INPUT_INVALID", "intent.dueDate"))
  }
  if (input.intent.ownerId !== null && !isNonEmpty(input.intent.ownerId)) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_INPUT_INVALID", "intent.ownerId"))
  }

  return errors
}

function validateTemplate(
  input: DevelopmentTemplateApplicationResolutionInput,
): DevelopmentTemplateResolutionIssue[] {
  const errors: DevelopmentTemplateResolutionIssue[] = []
  const template = input.templateVersion

  if (
    !isNonEmpty(template.id) ||
    !isNonEmpty(template.templateId) ||
    !isNonEmpty(template.name) ||
    !Number.isInteger(template.versionNumber) ||
    template.versionNumber < 1
  ) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_INPUT_INVALID", "templateVersion"))
  }
  if (template.status !== "published") {
    errors.push(
      issue(
        "DEVELOPMENT_TEMPLATE_VERSION_NOT_CONSUMABLE",
        "templateVersion.status",
      ),
    )
  }
  if (
    (template.scope === "company" &&
      template.companyId !== input.identity.companyId) ||
    (template.scope === "global" && template.companyId !== null)
  ) {
    errors.push(
      issue("DEVELOPMENT_TEMPLATE_TENANT_MISMATCH", "templateVersion.companyId"),
    )
  }
  if (
    template.suggestedDurationDays !== null &&
    (!Number.isInteger(template.suggestedDurationDays) ||
      template.suggestedDurationDays < 1)
  ) {
    errors.push(
      issue(
        "DEVELOPMENT_TEMPLATE_INPUT_INVALID",
        "templateVersion.suggestedDurationDays",
      ),
    )
  }
  if (input.goals.length === 0) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_WITHOUT_GOALS", "goals"))
  }

  return errors
}

function findSingleById<T extends Readonly<{ id: string }>>(
  rows: readonly T[],
  id: string,
): T | null | "ambiguous" {
  const matches = rows.filter((row) => row.id === id)
  if (matches.length === 0) return null
  if (matches.length > 1) return "ambiguous"
  return matches[0]
}

function resolveCurrentLevel(
  input: DevelopmentTemplateApplicationResolutionInput,
  competencyId: string,
  path: string,
  errors: DevelopmentTemplateResolutionIssue[],
): number {
  const activeLevels = input.employeeCompetencyLevels.filter(
    (level) => level.competencyId === competencyId && level.active,
  )
  if (activeLevels.length > 1) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_REFERENCE_INVALID", path))
    return 0
  }
  const currentLevel = activeLevels[0]?.currentLevel ?? 0
  if (!Number.isInteger(currentLevel) || currentLevel < 0 || currentLevel > 5) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_INPUT_INVALID", path))
    return 0
  }
  return currentLevel
}

function resolveOperationalCompetency(
  input: DevelopmentTemplateApplicationResolutionInput,
  competencyId: string,
  path: string,
  errors: DevelopmentTemplateResolutionIssue[],
): OperationalCompetencyInput | null {
  const competency = findSingleById(input.operationalCompetencies, competencyId)
  if (competency === null || competency === "ambiguous") {
    errors.push(issue("DEVELOPMENT_TEMPLATE_COMPETENCY_UNAVAILABLE", path))
    return null
  }
  if (competency.companyId !== input.identity.companyId) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_TENANT_MISMATCH", path))
    return null
  }
  if (!competency.active) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_COMPETENCY_UNAVAILABLE", path))
    return null
  }
  if (
    !isNonEmpty(competency.name) ||
    !Number.isInteger(competency.expectedLevel) ||
    competency.expectedLevel < 1 ||
    competency.expectedLevel > 5
  ) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_INPUT_INVALID", path))
    return null
  }
  return competency
}

type GlobalMappingResolution = Readonly<{
  mapping: TenantCompetencyMappingInput
  conceptVersion: GlobalCompetencyConceptVersionInput
  compatibility: AppliedConceptCompatibility | null
}>

function compatibilityCandidates(
  input: DevelopmentTemplateApplicationResolutionInput,
  requiredConceptVersion: GlobalCompetencyConceptVersionInput,
): readonly Readonly<{
  declaration: ConceptVersionCompatibilityInput
  conceptVersion: GlobalCompetencyConceptVersionInput
}>[] {
  return input.compatibilities.flatMap((declaration) => {
    if (declaration.requiredVersionId !== requiredConceptVersion.id) return []
    const compatible = findSingleById(
      input.globalConceptVersions,
      declaration.compatibleVersionId,
    )
    if (
      compatible === null ||
      compatible === "ambiguous" ||
      compatible.conceptId !== requiredConceptVersion.conceptId ||
      compatible.status !== "published"
    ) {
      return []
    }
    return [{ declaration, conceptVersion: compatible }]
  })
}

function resolveGlobalMapping(
  input: DevelopmentTemplateApplicationResolutionInput,
  requiredConceptVersion: GlobalCompetencyConceptVersionInput,
  path: string,
  errors: DevelopmentTemplateResolutionIssue[],
  warnings: DevelopmentTemplateResolutionWarning[],
): GlobalMappingResolution | null {
  const exactMappings = input.tenantMappings.filter(
    (mapping) => mapping.conceptVersionId === requiredConceptVersion.id,
  )
  const exactConfirmed = exactMappings.filter(
    (mapping) =>
      mapping.companyId === input.identity.companyId &&
      mapping.status === "confirmed" &&
      mapping.confirmedBy !== null &&
      mapping.confirmedAt !== null,
  )

  if (exactConfirmed.length > 1) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_MAPPING_AMBIGUOUS", path))
    return null
  }
  if (exactConfirmed.length === 1) {
    return {
      mapping: exactConfirmed[0],
      conceptVersion: requiredConceptVersion,
      compatibility: null,
    }
  }
  if (exactMappings.some((mapping) => mapping.companyId !== input.identity.companyId)) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_TENANT_MISMATCH", path))
    return null
  }
  if (exactMappings.length > 0) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_MAPPING_NOT_ACTIVE", path))
    return null
  }

  const compatibleVersions = compatibilityCandidates(input, requiredConceptVersion)
  const compatibleVersionIds = new Set(
    compatibleVersions.map((candidate) => candidate.conceptVersion.id),
  )
  const compatibleMappings = input.tenantMappings.filter((mapping) =>
    compatibleVersionIds.has(mapping.conceptVersionId),
  )
  const compatibleConfirmed = compatibleMappings.filter(
    (mapping) =>
      mapping.companyId === input.identity.companyId &&
      mapping.status === "confirmed" &&
      mapping.confirmedBy !== null &&
      mapping.confirmedAt !== null,
  )

  if (compatibleConfirmed.length > 1) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_MAPPING_AMBIGUOUS", path))
    return null
  }
  if (compatibleConfirmed.length === 0) {
    if (
      compatibleMappings.some(
        (mapping) => mapping.companyId !== input.identity.companyId,
      )
    ) {
      errors.push(issue("DEVELOPMENT_TEMPLATE_TENANT_MISMATCH", path))
    } else if (compatibleMappings.length > 0) {
      errors.push(issue("DEVELOPMENT_TEMPLATE_MAPPING_NOT_ACTIVE", path))
    } else {
      errors.push(issue("DEVELOPMENT_TEMPLATE_MAPPING_REQUIRED", path))
    }
    return null
  }

  const mapping = compatibleConfirmed[0]
  const matchingCompatibilities = compatibleVersions.filter(
    (candidate) => candidate.conceptVersion.id === mapping.conceptVersionId,
  )
  if (matchingCompatibilities.length > 1) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_MAPPING_AMBIGUOUS", path))
    return null
  }
  const compatibleVersion = matchingCompatibilities[0]
  if (compatibleVersion === undefined) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_REFERENCE_INVALID", path))
    return null
  }

  const compatibility: AppliedConceptCompatibility = {
    declarationId: compatibleVersion.declaration.id,
    requiredConceptVersionId: requiredConceptVersion.id,
    mappedConceptVersionId: compatibleVersion.conceptVersion.id,
  }
  warnings.push({
    code: "DEVELOPMENT_TEMPLATE_COMPATIBILITY_APPLIED",
    path,
    requiredConceptVersionId: requiredConceptVersion.id,
    mappedConceptVersionId: compatibleVersion.conceptVersion.id,
  })
  return { mapping, conceptVersion: compatibleVersion.conceptVersion, compatibility }
}

function resolveActions(
  actions: readonly DevelopmentTemplateVersionActionInput[],
  goal: DevelopmentTemplateVersionGoalInput,
  startDate: string,
  errors: DevelopmentTemplateResolutionIssue[],
): readonly ResolvedDevelopmentTemplateAction[] {
  return actions
    .filter((action) => action.templateVersionGoalId === goal.id)
    .sort(compareOrdered)
    .flatMap((action, index) => {
      const path = `goals.${goal.id}.actions.${index}`
      if (
        !isNonEmpty(action.id) ||
        !isNonEmpty(action.title) ||
        !isNonEmpty(action.type) ||
        !Number.isInteger(action.orderIndex) ||
        action.orderIndex < 0 ||
        !isValidInstant(action.createdAt) ||
        (action.suggestedDueDays !== null &&
          (!Number.isInteger(action.suggestedDueDays) ||
            action.suggestedDueDays < 1))
      ) {
        errors.push(issue("DEVELOPMENT_TEMPLATE_INPUT_INVALID", path))
        return []
      }
      return [
        {
          sourceActionId: action.id,
          title: action.title,
          description: action.description,
          type: action.type,
          suggestedDueDays: action.suggestedDueDays,
          dueDate:
            action.suggestedDueDays === null || !isValidDate(startDate)
              ? null
              : addDays(startDate, action.suggestedDueDays),
          orderIndex: action.orderIndex,
        },
      ]
    })
}

function resolveGoal(
  input: DevelopmentTemplateApplicationResolutionInput,
  goal: DevelopmentTemplateVersionGoalInput,
  index: number,
  errors: DevelopmentTemplateResolutionIssue[],
  warnings: DevelopmentTemplateResolutionWarning[],
): ResolvedDevelopmentTemplateGoal | null {
  const path = `goals.${index}`
  if (
    !isNonEmpty(goal.id) ||
    goal.templateVersionId !== input.templateVersion.id ||
    !Number.isInteger(goal.orderIndex) ||
    goal.orderIndex < 0 ||
    !isValidInstant(goal.createdAt) ||
    !Number.isInteger(goal.suggestedTargetLevel) ||
    goal.suggestedTargetLevel < 1 ||
    goal.suggestedTargetLevel > 5
  ) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_REFERENCE_INVALID", path))
    return null
  }

  let competencyId: string | null = null
  let globalCompetency: ResolvedGlobalCompetency | null = null

  if (input.templateVersion.scope === "company") {
    if (
      goal.companyId !== input.identity.companyId ||
      goal.competencyId === null ||
      goal.globalConceptVersionId !== null
    ) {
      errors.push(issue("DEVELOPMENT_TEMPLATE_TENANT_MISMATCH", path))
      return null
    }
    competencyId = goal.competencyId
  } else {
    if (
      goal.companyId !== null ||
      goal.competencyId !== null ||
      goal.globalConceptVersionId === null
    ) {
      errors.push(issue("DEVELOPMENT_TEMPLATE_REFERENCE_INVALID", path))
      return null
    }
    const requiredConceptVersion = findSingleById(
      input.globalConceptVersions,
      goal.globalConceptVersionId,
    )
    if (
      requiredConceptVersion === null ||
      requiredConceptVersion === "ambiguous" ||
      requiredConceptVersion.status !== "published"
    ) {
      errors.push(
        issue("DEVELOPMENT_TEMPLATE_CONCEPT_VERSION_UNAVAILABLE", path),
      )
      return null
    }
    const mappingResolution = resolveGlobalMapping(
      input,
      requiredConceptVersion,
      path,
      errors,
      warnings,
    )
    if (!mappingResolution) return null
    competencyId = mappingResolution.mapping.competencyId
    globalCompetency = {
      conceptId: requiredConceptVersion.conceptId,
      conceptCode: requiredConceptVersion.conceptCode,
      requiredVersionId: requiredConceptVersion.id,
      requiredVersionNumber: requiredConceptVersion.versionNumber,
      requiredName: requiredConceptVersion.name,
      requiredDefinition: requiredConceptVersion.definition,
      requiredCategory: requiredConceptVersion.category,
      mappingId: mappingResolution.mapping.id,
      mappedConceptVersionId: mappingResolution.conceptVersion.id,
      confirmedBy: mappingResolution.mapping.confirmedBy as string,
      confirmedAt: mappingResolution.mapping.confirmedAt as string,
      compatibility: mappingResolution.compatibility,
    }
  }

  const competency = resolveOperationalCompetency(
    input,
    competencyId,
    `${path}.competency`,
    errors,
  )
  if (!competency) return null
  const currentLevel = resolveCurrentLevel(
    input,
    competency.id,
    `${path}.currentLevel`,
    errors,
  )
  if (goal.suggestedTargetLevel < currentLevel) {
    errors.push(
      issue("DEVELOPMENT_TEMPLATE_TARGET_BELOW_CURRENT_LEVEL", path),
    )
    return null
  }

  return {
    sourceGoalId: goal.id,
    description: goal.description,
    orderIndex: goal.orderIndex,
    suggestedTargetLevel: goal.suggestedTargetLevel,
    currentLevel,
    expectedLevel: competency.expectedLevel,
    appliedTargetLevel: goal.suggestedTargetLevel,
    competency: {
      id: competency.id,
      companyId: competency.companyId,
      name: competency.name,
      description: competency.description,
      expectedLevel: competency.expectedLevel,
    },
    globalCompetency,
    actions: resolveActions(
      input.actions,
      goal,
      input.intent.startDate,
      errors,
    ),
  }
}

function validateCollectionIntegrity(
  input: DevelopmentTemplateApplicationResolutionInput,
): DevelopmentTemplateResolutionIssue[] {
  const errors: DevelopmentTemplateResolutionIssue[] = []
  const goalIds = new Set(input.goals.map((goal) => goal.id))
  if (goalIds.size !== input.goals.length) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_REFERENCE_INVALID", "goals"))
  }
  const actionIds = new Set(input.actions.map((action) => action.id))
  if (actionIds.size !== input.actions.length) {
    errors.push(issue("DEVELOPMENT_TEMPLATE_REFERENCE_INVALID", "actions"))
  }
  for (const action of input.actions) {
    if (!goalIds.has(action.templateVersionGoalId)) {
      errors.push(
        issue(
          "DEVELOPMENT_TEMPLATE_REFERENCE_INVALID",
          `actions.${action.id}.templateVersionGoalId`,
        ),
      )
    }
  }
  return errors
}

export function resolveDevelopmentTemplateApplication(
  input: DevelopmentTemplateApplicationResolutionInput,
): DevelopmentTemplateApplicationResolutionResult {
  const errors = [
    ...validateIdentityAndIntent(input),
    ...validateTemplate(input),
    ...validateCollectionIntegrity(input),
  ]
  const warnings: DevelopmentTemplateResolutionWarning[] = []
  const orderedGoals = [...input.goals].sort(compareOrdered)
  const goals = orderedGoals.flatMap((goal, index) => {
    const resolved = resolveGoal(input, goal, index, errors, warnings)
    return resolved ? [resolved] : []
  })

  if (errors.length > 0) {
    return deepFreeze({
      ok: false,
      errors: sortIssues(errors),
      warnings: sortWarnings(warnings),
    })
  }

  const sortedWarnings = sortWarnings(warnings)
  const fingerprint = createCanonicalFingerprint({
    format: "development-template-application-intent/v1",
    companyId: input.identity.companyId,
    actorUserId: input.identity.actorUserId,
    templateVersionId: input.templateVersion.id,
    employeeId: input.intent.employeeId,
    ownerId: input.intent.ownerId,
    priority: input.intent.priority,
    startDate: input.intent.startDate,
    dueDate: input.intent.dueDate,
  })
  const snapshot = {
    formatVersion: 1 as const,
    application: {
      id: input.identity.applicationId,
      companyId: input.identity.companyId,
      actorUserId: input.identity.actorUserId,
      technicalPrincipal: input.identity.technicalPrincipal,
      idempotencyKey: input.identity.idempotencyKey,
      correlationId: input.identity.correlationId,
      effectiveAt: input.identity.effectiveAt,
    },
    template: {
      id: input.templateVersion.templateId,
      versionId: input.templateVersion.id,
      versionNumber: input.templateVersion.versionNumber,
      scope: input.templateVersion.scope,
      companyId: input.templateVersion.companyId,
      name: input.templateVersion.name,
      description: input.templateVersion.description,
      suggestedDurationDays: input.templateVersion.suggestedDurationDays,
    },
    plan: {
      employeeId: input.intent.employeeId,
      ownerId: input.intent.ownerId,
      priority: input.intent.priority,
      startDate: input.intent.startDate,
      dueDate: input.intent.dueDate,
    },
    goals,
  }
  const lineage = {
    applicationId: input.identity.applicationId,
    companyId: input.identity.companyId,
    templateId: input.templateVersion.templateId,
    templateVersionId: input.templateVersion.id,
    templateVersionNumber: input.templateVersion.versionNumber,
    scope: input.templateVersion.scope,
    snapshotFormatVersion: 1 as const,
    intentFingerprint: fingerprint,
  }
  const metadata = {
    resolverVersion: 1 as const,
    effectiveAt: input.identity.effectiveAt,
    idempotencyKey: input.identity.idempotencyKey,
    correlationId: input.identity.correlationId,
    actorUserId: input.identity.actorUserId,
    technicalPrincipal: input.identity.technicalPrincipal,
  }

  return deepFreeze({
    ok: true,
    resolution: {
      fingerprint,
      snapshot,
      lineage,
      metadata,
      goals,
      warnings: sortedWarnings,
    },
  })
}
