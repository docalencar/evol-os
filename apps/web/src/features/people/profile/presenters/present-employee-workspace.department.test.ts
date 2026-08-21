import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import type { Employee } from "../../types/employee"

import { presentEmployeeWorkspace } from "./present-employee-workspace"

function makeEmployee(
  overrides: Partial<Employee> = {}
): Employee {
  return {
    id: "emp-1",
    company_id: "co-1",
    full_name: "Omega Testperson Import",
    email: "omega@example.com",
    phone: null,
    birth_date: null,
    hire_date: null,
    status: "active",
    manager_id: null,
    team_id: null,
    position_id: "pos-1",
    seniority_level_id: null,
    disc_profile: null,
    avatar_url: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function present(
  departmentName: string | null,
  employee: Employee = makeEmployee()
) {
  return presentEmployeeWorkspace({
    employee,
    departmentName,
    positionName: "QA Import Analyst Omega",
    teamName: null,
    managerName: null,
    teams: [],
    positions: [{ id: "pos-1", name: "QA Import Analyst Omega" }],
    managers: [],
  })
}

test("1. Department appears in the profile Organization presentation", () => {
  const workspace = present("QA Import Dept Omega")
  assert.equal(
    workspace.organization.departmentLabel,
    "QA Import Dept Omega"
  )
})

test("2. department name is sourced from the resolved trusted read (input), not inferred", () => {
  // The presenter only formats the name it is given; it does not read tables or
  // infer from the position label.
  const workspace = present("Engenharia de Produto")
  assert.equal(
    workspace.organization.departmentLabel,
    "Engenharia de Produto"
  )
  assert.notEqual(
    workspace.organization.departmentLabel,
    workspace.organization.positionLabel
  )
})

test("4. missing Department shows an explicit safe empty state", () => {
  const workspace = present(null)
  assert.equal(
    workspace.organization.departmentLabel,
    "Sem departamento definido"
  )
  // Never undefined/null, never inferred from the position.
  assert.doesNotMatch(
    workspace.organization.departmentLabel,
    /undefined|null/i
  )
})

test("5. existing organization fields remain intact", () => {
  const workspace = present("QA Import Dept Omega")
  const org = workspace.organization
  assert.equal(org.positionLabel, "QA Import Analyst Omega")
  assert.equal(org.seniorityLabel, "Sem senioridade específica")
  assert.equal(org.teamLabel, "Sem time definido")
  assert.equal(org.managerLabel, "Sem gestor definido")
  assert.equal(org.statusLabel, "Ativo")
  assert.ok(org.hireDateLabel.length > 0)
})

const sidebar = readFileSync(
  new URL(
    "../components/employee-profile-sidebar.tsx",
    import.meta.url
  ),
  "utf8"
)

const profilePage = readFileSync(
  new URL(
    "../../../../app/(dashboard)/app/people/[id]/page.tsx",
    import.meta.url
  ),
  "utf8"
)

test("3. Department is rendered before Cargo in the Organization card", () => {
  const departmentIndex = sidebar.indexOf('"Departamento"')
  const cargoIndex = sidebar.indexOf('"Cargo"')
  assert.ok(departmentIndex > -1, "Departamento row exists")
  assert.ok(cargoIndex > -1, "Cargo row exists")
  assert.ok(
    departmentIndex < cargoIndex,
    "Departamento must appear before Cargo"
  )
})

test("5b. the sidebar keeps the full organization hierarchy", () => {
  for (const label of [
    "Departamento",
    "Cargo",
    "Senioridade",
    "Time",
    "Gestor",
    "Status",
    "Admissão",
  ]) {
    assert.ok(sidebar.includes(`"${label}"`), label)
  }
})

test("6. Department is derived via trusted reads, not a direct department-table read", () => {
  assert.match(profilePage, /getManagementDepartments\(companyId\)/)
  // Canonical Position -> Department derivation.
  assert.match(profilePage, /departmentIdByPosition/)
  assert.match(profilePage, /position\.department_id/)
  // No direct DML / table access from the page.
  assert.doesNotMatch(profilePage, /\.from\(/)
  assert.doesNotMatch(profilePage, /from\("departments"\)/)
})

test("7. no Import/Apply/Timeline execution behavior is touched here", () => {
  assert.doesNotMatch(
    profilePage,
    /applyOrganizationSyncPlanAction|executeOrganizationSyncPlan|persistOrganizationTimeline|apply_tenant_organization_sync_plan_v1/
  )
})
