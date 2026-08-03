import assert from "node:assert/strict"
import test from "node:test"

import { resolveDevelopmentTemplateApplication } from "./resolve-development-template-application"
import { sha256 } from "./sha256"
import type {
  DevelopmentTemplateApplicationResolutionInput,
  GlobalCompetencyConceptVersionInput,
  TenantCompetencyMappingInput,
} from "./types"

function companyInput(): DevelopmentTemplateApplicationResolutionInput {
  return {
    identity: {
      applicationId: "application-1",
      companyId: "company-1",
      actorUserId: "user-1",
      technicalPrincipal: "service_role",
      idempotencyKey: "confirmation-1",
      correlationId: "correlation-1",
      effectiveAt: "2026-08-02T12:00:00.000Z",
    },
    intent: {
      employeeId: "employee-1",
      ownerId: "owner-1",
      priority: "high",
      startDate: "2026-08-01",
      dueDate: "2026-09-01",
    },
    templateVersion: {
      id: "template-version-1",
      templateId: "template-1",
      companyId: "company-1",
      scope: "company",
      versionNumber: 1,
      status: "published",
      name: "Leadership Plan",
      description: "A deterministic plan",
      suggestedDurationDays: 30,
    },
    goals: [
      {
        id: "goal-1",
        templateVersionId: "template-version-1",
        companyId: "company-1",
        competencyId: "competency-1",
        globalConceptVersionId: null,
        description: "Build leadership capability",
        suggestedTargetLevel: 4,
        orderIndex: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    actions: [
      {
        id: "action-1",
        templateVersionGoalId: "goal-1",
        title: "Complete the course",
        description: null,
        type: "course",
        suggestedDueDays: 10,
        orderIndex: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    operationalCompetencies: [
      {
        id: "competency-1",
        companyId: "company-1",
        name: "Leadership",
        description: "Leads teams",
        expectedLevel: 4,
        active: true,
      },
    ],
    employeeCompetencyLevels: [
      { competencyId: "competency-1", currentLevel: 2, active: true },
    ],
    globalConceptVersions: [],
    tenantMappings: [],
    compatibilities: [],
  }
}

function copyInput(
  input: DevelopmentTemplateApplicationResolutionInput,
): DevelopmentTemplateApplicationResolutionInput {
  return structuredClone(input)
}

function globalConcept(
  overrides: Partial<GlobalCompetencyConceptVersionInput> = {},
): GlobalCompetencyConceptVersionInput {
  return {
    id: "concept-version-2",
    conceptId: "concept-1",
    conceptCode: "leadership",
    versionNumber: 2,
    name: "Leadership",
    definition: "Mobilizes people toward shared outcomes",
    category: "behavioral",
    status: "published",
    ...overrides,
  }
}

function confirmedMapping(
  overrides: Partial<TenantCompetencyMappingInput> = {},
): TenantCompetencyMappingInput {
  return {
    id: "mapping-1",
    companyId: "company-1",
    conceptVersionId: "concept-version-2",
    competencyId: "competency-1",
    status: "confirmed",
    confirmedBy: "user-1",
    confirmedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  }
}

function globalInput(): DevelopmentTemplateApplicationResolutionInput {
  const input = companyInput()
  return {
    ...input,
    templateVersion: {
      ...input.templateVersion,
      companyId: null,
      scope: "global",
    },
    goals: input.goals.map((goal) => ({
      ...goal,
      companyId: null,
      competencyId: null,
      globalConceptVersionId: "concept-version-2",
    })),
    globalConceptVersions: [globalConcept()],
    tenantMappings: [confirmedMapping()],
  }
}

test("implements SHA-256 with stable standard vectors", () => {
  assert.equal(
    sha256(""),
    "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  )
  assert.equal(
    sha256("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  )
})

test("fails closed when the published template has no goals", () => {
  const input = companyInput()
  const result = resolveDevelopmentTemplateApplication({
    ...input,
    goals: [],
    actions: [],
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.ok(
    result.errors.some(
      (error) => error.code === "DEVELOPMENT_TEMPLATE_WITHOUT_GOALS",
    ),
  )
})

test("resolves a simple company-owned template without mappings", () => {
  const result = resolveDevelopmentTemplateApplication(companyInput())

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.resolution.goals.length, 1)
  assert.equal(result.resolution.goals[0].competency.id, "competency-1")
  assert.equal(result.resolution.goals[0].globalCompetency, null)
  assert.equal(result.resolution.goals[0].currentLevel, 2)
  assert.equal(result.resolution.goals[0].actions[0].dueDate, "2026-08-11")
  assert.deepEqual(result.resolution.warnings, [])
})

test("orders multiple goals and actions by order, creation time and id", () => {
  const input = companyInput()
  const secondGoal = {
    ...input.goals[0],
    id: "goal-0",
    competencyId: "competency-2",
    orderIndex: 0,
    createdAt: "2025-12-31T00:00:00.000Z",
  }
  const result = resolveDevelopmentTemplateApplication({
    ...input,
    goals: [input.goals[0], secondGoal],
    actions: [
      { ...input.actions[0], id: "action-z", orderIndex: 1 },
      { ...input.actions[0], id: "action-b", orderIndex: 0 },
      { ...input.actions[0], id: "action-a", orderIndex: 0 },
    ],
    operationalCompetencies: [
      ...input.operationalCompetencies,
      {
        ...input.operationalCompetencies[0],
        id: "competency-2",
        name: "Communication",
      },
    ],
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(
    result.resolution.goals.map((goal) => goal.sourceGoalId),
    ["goal-0", "goal-1"],
  )
  assert.deepEqual(
    result.resolution.goals[1].actions.map((action) => action.sourceActionId),
    ["action-a", "action-b", "action-z"],
  )
})

test("resolves a global template through an exact confirmed mapping", () => {
  const result = resolveDevelopmentTemplateApplication(globalInput())

  assert.equal(result.ok, true)
  if (!result.ok) return
  const global = result.resolution.goals[0].globalCompetency
  assert.equal(global?.requiredVersionId, "concept-version-2")
  assert.equal(global?.mappingId, "mapping-1")
  assert.equal(global?.compatibility, null)
})

test("applies only an explicit same-concept compatibility", () => {
  const input = globalInput()
  const result = resolveDevelopmentTemplateApplication({
    ...input,
    globalConceptVersions: [
      ...input.globalConceptVersions,
      globalConcept({ id: "concept-version-1", versionNumber: 1 }),
    ],
    tenantMappings: [
      confirmedMapping({ conceptVersionId: "concept-version-1" }),
    ],
    compatibilities: [
      {
        id: "compatibility-1",
        requiredVersionId: "concept-version-2",
        compatibleVersionId: "concept-version-1",
      },
    ],
  })

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(
    result.resolution.goals[0].globalCompetency?.compatibility?.declarationId,
    "compatibility-1",
  )
  assert.deepEqual(
    result.resolution.warnings.map((warning) => warning.code),
    ["DEVELOPMENT_TEMPLATE_COMPATIBILITY_APPLIED"],
  )
})

test("fails when a mapping targets another version without compatibility", () => {
  const input = globalInput()
  const result = resolveDevelopmentTemplateApplication({
    ...input,
    globalConceptVersions: [
      ...input.globalConceptVersions,
      globalConcept({ id: "concept-version-1", versionNumber: 1 }),
    ],
    tenantMappings: [
      confirmedMapping({ conceptVersionId: "concept-version-1" }),
    ],
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.ok(
    result.errors.some(
      (error) => error.code === "DEVELOPMENT_TEMPLATE_MAPPING_REQUIRED",
    ),
  )
})

test("fails closed for inactive and ambiguous mappings", () => {
  const input = globalInput()
  const inactive = resolveDevelopmentTemplateApplication({
    ...input,
    tenantMappings: [
      confirmedMapping({
        status: "inactive",
        confirmedBy: null,
        confirmedAt: null,
      }),
    ],
  })
  const ambiguous = resolveDevelopmentTemplateApplication({
    ...input,
    tenantMappings: [
      confirmedMapping(),
      confirmedMapping({ id: "mapping-2", competencyId: "competency-2" }),
    ],
  })

  assert.equal(inactive.ok, false)
  assert.equal(ambiguous.ok, false)
  if (!inactive.ok) {
    assert.ok(
      inactive.errors.some(
        (error) => error.code === "DEVELOPMENT_TEMPLATE_MAPPING_NOT_ACTIVE",
      ),
    )
  }
  if (!ambiguous.ok) {
    assert.ok(
      ambiguous.errors.some(
        (error) => error.code === "DEVELOPMENT_TEMPLATE_MAPPING_AMBIGUOUS",
      ),
    )
  }
})

test("produces stable ordering for equivalent input permutations", () => {
  const input = companyInput()
  const extraAction = {
    ...input.actions[0],
    id: "action-0",
    createdAt: "2025-12-01T00:00:00.000Z",
  }
  const first = resolveDevelopmentTemplateApplication({
    ...input,
    actions: [input.actions[0], extraAction],
  })
  const second = resolveDevelopmentTemplateApplication({
    ...copyInput(input),
    actions: [extraAction, input.actions[0]],
  })

  assert.deepEqual(first, second)
})

test("creates a stable canonical fingerprint and changes it with intent", () => {
  const input = companyInput()
  const first = resolveDevelopmentTemplateApplication(input)
  const retry = resolveDevelopmentTemplateApplication(copyInput(input))
  const changed = resolveDevelopmentTemplateApplication({
    ...copyInput(input),
    intent: { ...input.intent, priority: "low" },
  })

  assert.equal(first.ok, true)
  assert.equal(retry.ok, true)
  assert.equal(changed.ok, true)
  if (!first.ok || !retry.ok || !changed.ok) return
  assert.match(first.resolution.fingerprint, /^sha256:[a-f0-9]{64}$/)
  assert.equal(first.resolution.fingerprint, retry.resolution.fingerprint)
  assert.notEqual(first.resolution.fingerprint, changed.resolution.fingerprint)
})

test("creates a stable self-contained immutable logical snapshot", () => {
  const input = globalInput()
  const first = resolveDevelopmentTemplateApplication(input)
  const second = resolveDevelopmentTemplateApplication(copyInput(input))

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  if (!first.ok || !second.ok) return
  assert.deepEqual(first.resolution.snapshot, second.resolution.snapshot)
  assert.equal(first.resolution.snapshot.template.name, "Leadership Plan")
  assert.equal(
    first.resolution.snapshot.goals[0].competency.name,
    "Leadership",
  )
  assert.ok(Object.isFrozen(first.resolution.snapshot))
  assert.ok(Object.isFrozen(first.resolution.snapshot.goals[0]))
})

test("creates stable logical lineage independent from mutable records", () => {
  const input = companyInput()
  const first = resolveDevelopmentTemplateApplication(input)
  const second = resolveDevelopmentTemplateApplication(copyInput(input))

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  if (!first.ok || !second.ok) return
  assert.deepEqual(first.resolution.lineage, second.resolution.lineage)
  assert.deepEqual(first.resolution.lineage, {
    applicationId: "application-1",
    companyId: "company-1",
    templateId: "template-1",
    templateVersionId: "template-version-1",
    templateVersionNumber: 1,
    scope: "company",
    snapshotFormatVersion: 1,
    intentFingerprint: first.resolution.fingerprint,
  })
  assert.deepEqual(first.resolution.metadata, {
    resolverVersion: 1,
    effectiveAt: input.identity.effectiveAt,
    idempotencyKey: input.identity.idempotencyKey,
    correlationId: input.identity.correlationId,
    actorUserId: input.identity.actorUserId,
    technicalPrincipal: input.identity.technicalPrincipal,
  })
})

test("reports orphan actions as structural inconsistency", () => {
  const input = companyInput()
  const result = resolveDevelopmentTemplateApplication({
    ...input,
    actions: [
      { ...input.actions[0], templateVersionGoalId: "missing-goal" },
    ],
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.ok(
    result.errors.some(
      (error) => error.code === "DEVELOPMENT_TEMPLATE_REFERENCE_INVALID",
    ),
  )
})

test("rejects invalid dates and non-consumable versions", () => {
  const input = companyInput()
  const result = resolveDevelopmentTemplateApplication({
    ...input,
    intent: { ...input.intent, startDate: "invalid" },
    templateVersion: { ...input.templateVersion, status: "draft" },
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.deepEqual(
    result.errors.map((error) => error.code),
    [
      "DEVELOPMENT_TEMPLATE_INPUT_INVALID",
      "DEVELOPMENT_TEMPLATE_VERSION_NOT_CONSUMABLE",
    ],
  )
})

test("rejects a target below the active employee competency level", () => {
  const input = companyInput()
  const result = resolveDevelopmentTemplateApplication({
    ...input,
    employeeCompetencyLevels: [
      { competencyId: "competency-1", currentLevel: 5, active: true },
    ],
  })

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.ok(
    result.errors.some(
      (error) =>
        error.code === "DEVELOPMENT_TEMPLATE_TARGET_BELOW_CURRENT_LEVEL",
    ),
  )
})

test("does not mutate input and returns the same result repeatedly", () => {
  const input = companyInput()
  const before = copyInput(input)
  const results = Array.from({ length: 25 }, () =>
    resolveDevelopmentTemplateApplication(input),
  )

  assert.deepEqual(input, before)
  for (const result of results.slice(1)) {
    assert.deepEqual(result, results[0])
  }
})
