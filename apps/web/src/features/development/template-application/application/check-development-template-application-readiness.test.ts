import assert from "node:assert/strict"
import test from "node:test"

import {
  CheckDevelopmentTemplateApplicationReadiness,
  type DevelopmentTemplateApplicationIntent,
  type DevelopmentTemplateApplicationResolutionRepository,
} from "./index"

const intent: DevelopmentTemplateApplicationIntent = {
  identity: {
    applicationId: "application-1", companyId: "company-1", actorUserId: "actor-1",
    technicalPrincipal: "service_role", idempotencyKey: "key-1", correlationId: "correlation-1",
    effectiveAt: "2026-08-08T12:00:00.000Z",
  },
  intent: { employeeId: "employee-1", ownerId: null, priority: "medium", startDate: "2026-08-08", dueDate: null },
  templateVersionId: "version-1",
}

function repository(withGoals: boolean): DevelopmentTemplateApplicationResolutionRepository {
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

test("allows readiness through the same deterministic resolver without persistence", async () => {
  const result = await new CheckDevelopmentTemplateApplicationReadiness(repository(true)).execute(intent)
  assert.equal(result.ready, true)
  if (result.ready) assert.ok(result.fingerprint)
})

test("blocks readiness with the resolver error code", async () => {
  const result = await new CheckDevelopmentTemplateApplicationReadiness(repository(false)).execute(intent)
  assert.equal(result.ready, false)
  if (!result.ready) assert.equal(result.errors[0]?.code, "DEVELOPMENT_TEMPLATE_WITHOUT_GOALS")
})
