import assert from "node:assert/strict"
import test from "node:test"

import type { ChangeSet, PlanningScenarioContract } from "../../types/planning-contracts"
import type { ProjectedOrganization, ProjectionSnapshot } from "../contracts"
import { ProjectionEngine } from "../engine"

const scenario: PlanningScenarioContract = Object.freeze({
  id: "scenario-1", companyId: "company-1", workspaceId: "workspace-1",
  baseSnapshotId: "snapshot-1", name: "Cenário", description: null,
  status: "draft", version: 1,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
})

function organization(overrides: Partial<ProjectedOrganization> = {}): ProjectedOrganization {
  return Object.freeze({
    departments: Object.freeze([
      Object.freeze({ id: "department-1", name: "Financeiro", code: null, description: null, parentDepartmentId: null, status: "active" as const }),
      Object.freeze({ id: "department-2", name: "Operações", code: null, description: null, parentDepartmentId: null, status: "active" as const }),
    ]),
    teams: Object.freeze([
      Object.freeze({ id: "team-1", name: "Contas", code: null, description: null, departmentId: "department-1", status: "active" as const }),
      Object.freeze({ id: "team-2", name: "Campo", code: null, description: null, departmentId: "department-2", status: "active" as const }),
    ]),
    positions: Object.freeze([
      Object.freeze({ id: "position-1", name: "Analista", description: null, departmentId: "department-1", hierarchicalLevel: "analyst" as const, weeklyWorkloadHours: 40, workModel: "hybrid" as const, employmentType: "clt" as const, travelRequirement: "none" as const, status: "active" as const }),
      Object.freeze({ id: "position-2", name: "Especialista", description: null, departmentId: "department-2", hierarchicalLevel: "specialist" as const, weeklyWorkloadHours: 40, workModel: "remote" as const, employmentType: "clt" as const, travelRequirement: "none" as const, status: "active" as const }),
    ]),
    employees: Object.freeze([]), vacancies: Object.freeze([]),
    metrics: Object.freeze({ headcount: 0, vacancies: 0, salaryMass: 0, departments: 2, positions: 2 }),
    ...overrides,
  })
}

function snapshot(base = organization()): ProjectionSnapshot {
  return Object.freeze({ id: "snapshot-1", companyId: "company-1", workspaceId: "workspace-1", sourceScenarioId: null, version: 1, publishedAt: new Date("2026-01-01T00:00:00.000Z"), kind: "baseline", organization: base })
}

function vacancyChange(id: string, version: number, changeType: string, payload: Record<string, unknown>, companyId = "company-1"): ChangeSet {
  return Object.freeze({ id, version, changeType, companyId, scenarioId: "scenario-1", payload: Object.freeze({ ...payload }) })
}

test("executes create, update and close in order while preserving history", () => {
  const result = ProjectionEngine.create().project({ snapshot: snapshot(), scenario, changeSets: [
    vacancyChange("close", 3, "vacancy.close", { vacancyId: "vacancy-1" }),
    vacancyChange("create", 1, "vacancy.create", { vacancyId: "vacancy-1", positionId: "position-1", teamId: "team-1" }),
    vacancyChange("update", 2, "vacancy.update", { vacancyId: "vacancy-1", positionId: "position-2", departmentId: "department-2", teamId: "team-2" }),
  ] })
  assert.equal(result.isValid, true)
  assert.deepEqual(result.organization.vacancies, [{ id: "vacancy-1", positionId: "position-2", departmentId: "department-2", teamId: "team-2", status: "archived" }])
  assert.equal(result.metrics.vacancies, 0)
  assert.deepEqual(result.events.filter((event) => event.type === "change-set.executed").map((event) => event.changeSetId), ["create", "update", "close"])
})

test("rejects duplicates, missing vacancies and invalid references without mutation", () => {
  const active = Object.freeze([{ id: "vacancy-1", positionId: null, status: "active" as const }])
  const cases = [
    ["vacancy.create", { vacancyId: "vacancy-1" }, "vacancy.create.id_already_exists"],
    ["vacancy.update", { vacancyId: "missing", positionId: null }, "vacancy.update.not_found"],
    ["vacancy.close", { vacancyId: "missing" }, "vacancy.close.not_found"],
    ["vacancy.update", { vacancyId: "vacancy-1", positionId: "missing" }, "vacancy.update.position_not_found"],
    ["vacancy.update", { vacancyId: "vacancy-1", departmentId: "missing" }, "vacancy.update.department_not_found"],
    ["vacancy.update", { vacancyId: "vacancy-1", teamId: "missing" }, "vacancy.update.team_not_found"],
  ] as const
  for (const [changeType, payload, code] of cases) {
    const result = ProjectionEngine.create().project({ snapshot: snapshot(organization({ vacancies: active })), scenario, changeSets: [vacancyChange("change", 1, changeType, payload)] })
    assert.equal(result.errors[0]?.code, code)
    assert.deepEqual(result.organization.vacancies, active)
  }
})

test("keeps Vacancy and Employee structural references consistent", () => {
  const base = organization({ employees: Object.freeze([{
    id: "employee-1", positionId: "position-1", departmentId: "department-1", teamId: "team-1", status: "active" as const,
  }]) })
  const inconsistent = ProjectionEngine.create().project({ snapshot: snapshot(base), scenario, changeSets: [
    vacancyChange("vacancy", 1, "vacancy.create", { vacancyId: "vacancy-1", positionId: "position-1", departmentId: "department-2" }),
  ] })
  assert.equal(inconsistent.errors[0]?.code, "vacancy.create.position_department_mismatch")
  assert.deepEqual(inconsistent.organization.employees, base.employees)
})

test("prevents archiving structural references until the Vacancy is closed", () => {
  const changes = [
    vacancyChange("create", 1, "vacancy.create", { vacancyId: "vacancy-1", positionId: "position-1", departmentId: "department-1", teamId: "team-1" }),
    vacancyChange("archive-position", 2, "position.archive", { positionId: "position-1" }),
  ]
  const blocked = ProjectionEngine.create().project({ snapshot: snapshot(), scenario, changeSets: changes })
  assert.equal(blocked.errors[0]?.code, "position.archive.has_active_vacancies")

  const allowed = ProjectionEngine.create().project({ snapshot: snapshot(), scenario, changeSets: [
    changes[0]!, vacancyChange("close", 2, "vacancy.close", { vacancyId: "vacancy-1" }),
    vacancyChange("archive-position", 3, "position.archive", { positionId: "position-1" }),
  ] })
  assert.equal(allowed.isValid, true)
  assert.equal(allowed.organization.positions[0]?.status, "archived")
})

test("is deterministic, immutable and isolated by Company", () => {
  const base = organization()
  const original = structuredClone(base)
  const payload = { vacancyId: "vacancy-1", positionId: "position-1" }
  const change = vacancyChange("create", 1, "vacancy.create", payload)
  const first = ProjectionEngine.create().project({ snapshot: snapshot(base), scenario, changeSets: [change] })
  const second = ProjectionEngine.create().project({ snapshot: snapshot(base), scenario, changeSets: [change] })
  assert.deepEqual(first.organization, second.organization)
  assert.deepEqual(base, original)
  assert.deepEqual(payload, { vacancyId: "vacancy-1", positionId: "position-1" })
  assert.equal(Object.isFrozen(first.organization.vacancies[0]), true)

  const foreign = ProjectionEngine.create().project({ snapshot: snapshot(base), scenario, changeSets: [vacancyChange("foreign", 1, "vacancy.create", { vacancyId: "vacancy-2" }, "company-2")] })
  assert.equal(foreign.errors[0]?.code, "change_set_scope_mismatch")
  assert.deepEqual(foreign.organization.vacancies, [])
})
