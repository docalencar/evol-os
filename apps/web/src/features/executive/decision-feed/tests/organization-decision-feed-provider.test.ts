import assert from "node:assert/strict"
import test from "node:test"

import {
  OrganizationDecisionFeedProvider,
  type OrganizationExecutiveDepartment,
  type OrganizationExecutiveEmployee,
  type OrganizationExecutivePosition,
  type OrganizationExecutiveSource,
  type OrganizationExecutiveTeam,
} from "../adapters"

const generatedAt = "2026-08-01T12:00:00.000Z"

function createDepartment(
  overrides: Partial<OrganizationExecutiveDepartment> = {},
): OrganizationExecutiveDepartment {
  return {
    id: "department-1",
    name: "Comercial",
    manager_id: "employee-manager",
    updated_at: "2026-07-31T12:00:00.000Z",
    ...overrides,
  }
}

function createTeam(
  overrides: Partial<OrganizationExecutiveTeam> = {},
): OrganizationExecutiveTeam {
  return {
    id: "team-1",
    name: "Vendas",
    department_id: "department-1",
    manager_id: "employee-manager",
    updated_at: "2026-07-31T12:00:00.000Z",
    ...overrides,
  }
}

function createPosition(
  overrides: Partial<OrganizationExecutivePosition> = {},
): OrganizationExecutivePosition {
  return {
    id: "position-1",
    name: "Executivo de Vendas",
    status: "active",
    hierarchical_level: "analyst",
    updated_at: "2026-07-31T12:00:00.000Z",
    ...overrides,
  }
}

function createEmployee(
  overrides: Partial<OrganizationExecutiveEmployee> = {},
): OrganizationExecutiveEmployee {
  return {
    id: "employee-1",
    team_id: "team-1",
    position_id: "position-1",
    status: "active",
    ...overrides,
  }
}

function createSource(
  input: {
    departments?: readonly OrganizationExecutiveDepartment[]
    teams?: readonly OrganizationExecutiveTeam[]
    positions?: readonly OrganizationExecutivePosition[]
    employees?: readonly OrganizationExecutiveEmployee[]
  } = {},
): OrganizationExecutiveSource {
  return {
    async load() {
      return {
        departments: input.departments ?? [
          createDepartment(),
        ],
        teams: input.teams ?? [
          createTeam(),
        ],
        positions: input.positions ?? [
          createPosition(),
        ],
        employees: input.employees ?? [
          createEmployee(),
        ],
      }
    },
  }
}

test("retorna feed vazio para estrutura completa", async () => {
  const provider =
    new OrganizationDecisionFeedProvider(
      generatedAt,
      createSource(),
    )

  const feed = await provider.load()

  assert.deepEqual(feed.items, [])
})

test("gera alerta para departamento sem gestor", async () => {
  const provider =
    new OrganizationDecisionFeedProvider(
      generatedAt,
      createSource({
        departments: [
          createDepartment({
            manager_id: null,
          }),
        ],
      }),
    )

  const item = (await provider.load()).items[0]

  assert.equal(item?.source, "organization")
  assert.equal(item?.priority, "high")
  assert.match(item?.title ?? "", /sem gestor/)
})

test("gera alerta para equipe sem líder", async () => {
  const provider =
    new OrganizationDecisionFeedProvider(
      generatedAt,
      createSource({
        teams: [
          createTeam({
            manager_id: null,
          }),
        ],
      }),
    )

  const item = (await provider.load()).items[0]

  assert.equal(item?.priority, "high")
  assert.match(item?.title ?? "", /sem líder/)
})

test("gera alerta para equipe sem colaboradores", async () => {
  const provider =
    new OrganizationDecisionFeedProvider(
      generatedAt,
      createSource({
        employees: [],
      }),
    )

  const feed = await provider.load()

  assert.ok(
    feed.items.some(
      (item) =>
        item.id ===
        "organization:empty-team:team-1",
    ),
  )
})

test("gera alerta para cargo ativo sem ocupante", async () => {
  const provider =
    new OrganizationDecisionFeedProvider(
      generatedAt,
      createSource({
        employees: [
          createEmployee({
            position_id: null,
          }),
        ],
      }),
    )

  const feed = await provider.load()

  assert.ok(
    feed.items.some(
      (item) =>
        item.id ===
        "organization:vacant-position:position-1",
    ),
  )
})

test("cargo vago de liderança recebe prioridade alta", async () => {
  const provider =
    new OrganizationDecisionFeedProvider(
      generatedAt,
      createSource({
        positions: [
          createPosition({
            hierarchical_level: "director",
          }),
        ],
        employees: [
          createEmployee({
            position_id: null,
          }),
        ],
      }),
    )

  const item = (await provider.load()).items.find(
    (candidate) =>
      candidate.id ===
      "organization:vacant-position:position-1",
  )

  assert.equal(item?.priority, "high")
})
