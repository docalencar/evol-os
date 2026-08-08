import assert from "node:assert/strict"
import test from "node:test"

import type { DevelopmentTemplateApplicationResolution } from "../resolver"
import type { TrustedTemplateApplicationPersistence } from "../trusted-persistence"
import {
  ApplyDevelopmentTemplateApplicationService,
  type DevelopmentTemplateApplicationIntent,
  type DevelopmentTemplateApplicationResolutionRepository,
} from "./index"

const intent: DevelopmentTemplateApplicationIntent = {
  identity: {
    applicationId: "application-1",
    companyId: "company-1",
    actorUserId: "actor-1",
    technicalPrincipal: "service_role",
    idempotencyKey: "retry-key-1",
    correlationId: "correlation-1",
    effectiveAt: "2026-08-08T12:00:00.000Z",
  },
  intent: {
    employeeId: "employee-1",
    ownerId: null,
    priority: "medium",
    startDate: "2026-08-08",
    dueDate: null,
  },
  templateVersionId: "version-1",
}

function resolutionRepository(
  withGoals = true,
): DevelopmentTemplateApplicationResolutionRepository {
  return {
    async load() {
      return {
        templateVersion: {
          id: "version-1", templateId: "template-1", companyId: "company-1",
          scope: "company", versionNumber: 1, status: "published", name: "Template",
          description: null, suggestedDurationDays: null,
        },
        goals: withGoals ? [{
          id: "goal-1", templateVersionId: "version-1", companyId: "company-1",
          competencyId: "competency-1", globalConceptVersionId: null,
          description: "Goal", suggestedTargetLevel: 3, orderIndex: 0,
          createdAt: "2026-08-08T10:00:00.000Z",
        }] : [],
        actions: [],
        operationalCompetencies: [{
          id: "competency-1", companyId: "company-1", name: "Competency",
          description: null, expectedLevel: 3, active: true,
        }],
        employeeCompetencyLevels: [{ competencyId: "competency-1", currentLevel: 1, active: true }],
        globalConceptVersions: [], tenantMappings: [], compatibilities: [],
      }
    },
  }
}

function persistenceReturning(
  result: Awaited<ReturnType<TrustedTemplateApplicationPersistence["persist"]>>,
  captured: DevelopmentTemplateApplicationResolution[] = [],
): TrustedTemplateApplicationPersistence {
  return { async persist(resolution) { captured.push(resolution); return result } }
}

test("resolves and persists a successful application", async () => {
  const captured: DevelopmentTemplateApplicationResolution[] = []
  const service = new ApplyDevelopmentTemplateApplicationService(
    resolutionRepository(),
    persistenceReturning({ status: "created", applicationId: "application-1", planId: "plan-1", snapshotId: "snapshot-1" }, captured),
  )
  const result = await service.execute(intent)
  assert.equal(result.status, "created")
  assert.equal(captured.length, 1)
})

test("preserves idempotent retry results", async () => {
  const service = new ApplyDevelopmentTemplateApplicationService(
    resolutionRepository(),
    persistenceReturning({ status: "idempotent_retry", applicationId: "application-1", planId: "plan-1", snapshotId: "snapshot-1" }),
  )
  assert.equal((await service.execute(intent)).status, "idempotent_retry")
})

test("does not persist when the resolver rejects the input", async () => {
  let persistenceCalls = 0
  const service = new ApplyDevelopmentTemplateApplicationService(
    resolutionRepository(false),
    { async persist() { persistenceCalls += 1; throw new Error("unexpected") } },
  )
  const result = await service.execute(intent)
  assert.equal(result.status, "resolution_failure")
  assert.equal(persistenceCalls, 0)
  if (result.status === "resolution_failure") {
    assert.equal(result.errors[0]?.code, "DEVELOPMENT_TEMPLATE_WITHOUT_GOALS")
  }
})

test("propagates persistence error codes", async () => {
  const service = new ApplyDevelopmentTemplateApplicationService(
    resolutionRepository(),
    persistenceReturning({ status: "integrity_failure", code: "DEVELOPMENT_TEMPLATE_MAPPING_CHANGED" }),
  )
  assert.deepEqual(await service.execute(intent), {
    status: "integrity_failure", code: "DEVELOPMENT_TEMPLATE_MAPPING_CHANGED",
  })
})

test("preserves application identity, fingerprint, snapshot and lineage", async () => {
  const captured: DevelopmentTemplateApplicationResolution[] = []
  const service = new ApplyDevelopmentTemplateApplicationService(
    resolutionRepository(),
    persistenceReturning({ status: "created", applicationId: "application-1", planId: "plan-1", snapshotId: "snapshot-1" }, captured),
  )
  await service.execute(intent)
  const resolution = captured[0]
  assert.ok(resolution?.fingerprint)
  assert.equal(resolution?.snapshot.application.id, intent.identity.applicationId)
  assert.equal(resolution?.snapshot.application.idempotencyKey, intent.identity.idempotencyKey)
  assert.equal(resolution?.lineage.intentFingerprint, resolution?.fingerprint)
})
