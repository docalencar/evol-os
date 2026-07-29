import assert from "node:assert/strict"
import test from "node:test"

import {
  mapProjectionSnapshotRow,
  mapPublishedSnapshotRow,
} from "./snapshot-record"

test("keeps legacy snapshots readable without inventing an organization", () => {
  const row = legacySnapshotRow()

  const domainSnapshot = mapPublishedSnapshotRow(row)
  const projectionSnapshot = mapProjectionSnapshotRow(row)

  assert.equal(domainSnapshot.id, "snapshot-1")
  assert.equal("organization" in projectionSnapshot, false)
})

test("reads and defensively freezes a persisted organization", () => {
  const organization = {
    departments: [{
      id: "department-1",
      name: "Financeiro",
      code: null,
      description: null,
      parentDepartmentId: null,
      status: "active",
    }],
    teams: [],
    positions: [],
    employees: [],
    vacancies: [],
    metrics: {
      headcount: 0,
      vacancies: 0,
      salaryMass: 0,
      departments: 1,
      positions: 0,
    },
  }
  const snapshot = mapProjectionSnapshotRow({
    ...legacySnapshotRow(),
    kind: "baseline",
    organization,
  })

  organization.departments[0]!.name = "Mutado"

  assert.equal(snapshot.organization?.departments[0]?.name, "Financeiro")
  assert.equal(snapshot.kind, "baseline")
  assert.equal(Object.isFrozen(snapshot.organization), true)
  assert.equal(Object.isFrozen(snapshot.organization?.departments), true)
})

test("rejects an invalid persisted organization", () => {
  assert.throws(
    () => mapProjectionSnapshotRow({
      ...legacySnapshotRow(),
      organization: { departments: [] },
    }),
    /PLANNING_PROJECTED_ORGANIZATION_INVALID_DATA/
  )
})

test("round-trips a projected Snapshot with an archived Employee", () => {
  const organization = organizationWithEmployee("archived")
  const snapshot = mapProjectionSnapshotRow({
    ...legacySnapshotRow(),
    source_scenario_id: "scenario-1",
    version: 2,
    kind: "projection",
    organization,
  })

  assert.equal(snapshot.kind, "projection")
  assert.deepEqual(snapshot.organization?.employees, organization.employees)
  assert.equal(snapshot.organization?.metrics.headcount, 0)
  assert.notEqual(snapshot.organization, organization)
})

test("strictly rejects invalid Employee fields in persisted organizations", () => {
  const organization = organizationWithEmployee("active")
  assert.throws(() => mapProjectionSnapshotRow({
    ...legacySnapshotRow(),
    organization: {
      ...organization,
      employees: [{ ...organization.employees[0], status: "terminated" }],
    },
  }), /PLANNING_PROJECTED_ORGANIZATION_INVALID_DATA/)
})

function organizationWithEmployee(status: "active" | "archived") {
  return {
    departments: [], teams: [], positions: [], vacancies: [],
    employees: [{
      id: "employee-1",
      positionId: null,
      departmentId: null,
      teamId: null,
      status,
    }],
    metrics: {
      headcount: status === "active" ? 1 : 0,
      vacancies: 0,
      salaryMass: 0,
      departments: 0,
      positions: 0,
    },
  }
}

function legacySnapshotRow() {
  return {
    id: "snapshot-1",
    company_id: "company-1",
    workspace_id: "workspace-1",
    source_scenario_id: null,
    version: 1,
    published_at: "2026-07-29T12:00:00.000Z",
    organization: null,
  }
}
