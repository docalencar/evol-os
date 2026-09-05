import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

import { presentPersonCompetencyCoverage } from "@/features/people/competencies/presenters/present-person-competency-coverage"

import { createEmployeeInsights } from "./services/create-employee-insights"
import type { CanonicalPersonCompetencyCoverage } from "../competencies/person-competency-gaps/types/person-competency-gap"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const exists = (path: string) => existsSync(new URL(path, import.meta.url))

const peoplePage = read("../../app/(dashboard)/app/people/[id]/page.tsx")
const peoplePresenter = read("../people/competencies/presenters/present-person-competency-coverage.ts")
const dashboardRepository = read("../dashboard-read/repositories/tenant-dashboard-read-repository.ts")
const developmentService = read("../development/services/get-development-executive-dashboard.ts")
const developmentFeed = read("../executive/decision-feed/adapters/development-decision-feed-provider.ts")
const dashboardCompetencyQueries = read("../dashboard-read/queries/get-competency-development-read-models.ts")

function coverage(): CanonicalPersonCompetencyCoverage {
  return {
    assignmentState: "active_assignment_with_expectations",
    personId: "11111111-1111-4111-8111-111111111111",
    positionId: "22222222-2222-4222-8222-222222222222",
    positionSeniorityProfileId: "33333333-3333-4333-8333-333333333333",
    seniorityLevelId: null,
    competencies: [
      {
        competencyId: "44444444-4444-4444-8444-444444444444",
        competencyName: "Comunicação",
        expectedLevel: 4,
        currentLevel: 2,
        gap: 2,
        evidenceState: "assessed",
        weight: 1,
        required: true,
        competencyType: "core",
        inherited: false,
        expectationSource: "base",
        expectationNotes: null,
        employeeCompetencyId: null,
        evidenceSource: null,
        validatedAt: null,
      },
      {
        competencyId: "55555555-5555-4555-8555-555555555555",
        competencyName: "Estratégia",
        expectedLevel: 3,
        currentLevel: null,
        gap: null,
        evidenceState: "unassessed",
        weight: 5,
        required: false,
        competencyType: "optional",
        inherited: true,
        expectationSource: "inherited",
        expectationNotes: null,
        employeeCompetencyId: null,
        evidenceSource: null,
        validatedAt: null,
      },
    ],
  }
}

test("People keeps canonical facts and an explicit active Talent compatibility adapter", () => {
  const result = presentPersonCompetencyCoverage(coverage())

  assert.equal(result.canonical.competencies[0].gap, 2)
  assert.equal(result.canonical.competencies[0].state, "deficiency")
  assert.equal(result.canonical.competencies[1].gap, null)
  assert.equal(result.canonical.competencies[1].state, "unassessed")
  assert.deepEqual(result.legacyTalentCoverage.gaps.map((gap) => gap.gap), [-2])
  assert.equal(result.legacyTalentCoverage.unassessedCount, 1)
  assert.equal(createEmployeeInsights([...result.legacyTalentCoverage.gaps]).risk, "medium")
  assert.match(peoplePage, /legacyTalentCoverage/)
  assert.match(peoplePage, /TalentSummaryCard/)
})

test("canonical People, Dashboard and Development flows do not consume legacy helpers", () => {
  assert.match(peoplePage, /getCanonicalPersonCompetencyCoverage\(companyId, id\)/)
  assert.match(dashboardRepository, /loadCompetencyCoverages\(companyId\)/)
  assert.match(developmentService, /getCanonicalCompanyPersonCompetencyCoverages\(companyId\)/)
  assert.doesNotMatch(dashboardRepository, /get_tenant_competency_directory_v1/)
  assert.doesNotMatch(developmentService, /calculateCompetencyGap|createEmployeeInsights|getManagementCompetencyAssignments/)
  assert.doesNotMatch(developmentFeed, /calculateCompetencyGap|createEmployeeInsights|calculateRisk|calculateTalentCard|getBiggestGap/)
  assert.doesNotMatch(peoplePresenter, /currentLevel\s*\?\?\s*0|expectedLevel\s*\?\?\s*0/)
})

test("dead legacy application reads and aggregate helpers are absent", () => {
  for (const path of [
    "./queries/get-employee-competency-gaps.ts",
    "./services/get-company-competency-gaps.ts",
    "./services/get-development-priorities.ts",
    "./services/derive-competency-coverage.ts",
    "../competencies/position-competencies/index.ts",
    "../development/components/company-competency-gap-card.tsx",
    "../development/components/development-priorities-card.tsx",
  ]) {
    assert.equal(exists(path), false, path)
  }

  assert.doesNotMatch(dashboardCompetencyQueries, /get_tenant_competency_directory_v1|getManagementCompetencyAssignments/)
})
