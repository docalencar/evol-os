import assert from "node:assert/strict"
import test from "node:test"

import type { TrustedTemplateApplicationPersistence } from "../trusted-persistence"
import {
  ApplyDevelopmentTemplateApplicationService,
  CheckDevelopmentTemplateApplicationReadiness,
  type DevelopmentTemplateApplicationIntent,
  type DevelopmentTemplateApplicationResolutionRepository,
} from "./index"

const identity = {
  applicationId: "application-1", companyId: "company-1", actorUserId: "actor-1",
  technicalPrincipal: "service_role", idempotencyKey: "key-1", correlationId: "correlation-1",
  effectiveAt: "2026-08-08T12:00:00.000Z",
}
const intent: DevelopmentTemplateApplicationIntent = {
  identity,
  intent: { employeeId: "employee-1", ownerId: null, priority: "medium", startDate: "2026-08-08", dueDate: null },
  templateVersionId: "version-1",
}

function repository(withGoals = true): DevelopmentTemplateApplicationResolutionRepository {
  return { async load() { return {
    templateVersion: {
      id: "version-1", templateId: "template-1", companyId: "company-1", scope: "company",
      versionNumber: 1, status: "published", name: "Template", description: null, suggestedDurationDays: null,
    },
    goals: withGoals ? [{
      id: "goal-1", templateVersionId: "version-1", companyId: "company-1", competencyId: "competency-1",
      globalConceptVersionId: null, description: "Goal", suggestedTargetLevel: 3, orderIndex: 0,
      createdAt: "2026-08-08T10:00:00.000Z",
    }] : [],
    actions: [],
    operationalCompetencies: [{
      id: "competency-1", companyId: "company-1", name: "Competency", description: null,
      expectedLevel: 3, active: true,
    }],
    employeeCompetencyLevels: [{ competencyId: "competency-1", currentLevel: 1, active: true }],
    globalConceptVersions: [], tenantMappings: [], compatibilities: [],
  } } }
}

function durableFake(): TrustedTemplateApplicationPersistence {
  let fingerprint: string | undefined
  return { async persist(resolution) {
    if (!fingerprint) {
      fingerprint = resolution.fingerprint
      return { status: "created", applicationId: identity.applicationId, planId: "plan-1", snapshotId: "snapshot-1" }
    }
    if (fingerprint === resolution.fingerprint) {
      return { status: "idempotent_retry", applicationId: identity.applicationId, planId: "plan-1", snapshotId: "snapshot-1" }
    }
    return { status: "idempotency_conflict", applicationId: identity.applicationId, code: "IDEMPOTENCY_FINGERPRINT_CONFLICT" }
  } }
}

test("smoke: readiness, creation, replay and fingerprint conflict use one deterministic flow", async () => {
  const source = repository()
  const readiness = new CheckDevelopmentTemplateApplicationReadiness(source)
  const application = new ApplyDevelopmentTemplateApplicationService(source, durableFake())
  assert.equal((await readiness.execute(intent)).ready, true)
  assert.equal((await application.execute(intent)).status, "created")
  assert.equal((await application.execute(intent)).status, "idempotent_retry")
  assert.equal((await application.execute({ ...intent, intent: { ...intent.intent, priority: "high" } })).status, "idempotency_conflict")
})

test("smoke: blocked readiness never reaches trusted persistence", async () => {
  let writes = 0
  const source = repository(false)
  const readiness = new CheckDevelopmentTemplateApplicationReadiness(source)
  const application = new ApplyDevelopmentTemplateApplicationService(source, { async persist() { writes += 1; throw new Error("unexpected") } })
  assert.equal((await readiness.execute(intent)).ready, false)
  const result = await application.execute(intent)
  assert.equal(result.status, "resolution_failure")
  assert.equal(writes, 0)
})
