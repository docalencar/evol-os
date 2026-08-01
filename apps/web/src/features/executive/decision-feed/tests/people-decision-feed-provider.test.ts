import assert from "node:assert/strict"
import test from "node:test"

import type { Employee } from "@/features/people"
import type { PeopleSummary } from "@/features/people/dashboard/types/people-summary"

import {
  PeopleDecisionFeedProvider,
  type PeopleExecutiveSource,
} from "../adapters"

const generatedAt = "2026-08-01T12:00:00.000Z"

function createEmployee(
  overrides: Partial<Employee> = {},
): Employee {
  return {
    id: "employee-1",
    company_id: "company-1",
    user_id: null,
    avatar_url: null,
    full_name: "Ana Souza",
    email: "ana@empresa.com",
    phone: null,
    birth_date: null,
    hire_date: "2025-01-10",
    status: "active",
    team_id: null,
    position_id: null,
    manager_id: null,
    disc_profile: null,
    created_at: "2025-01-10T12:00:00.000Z",
    updated_at: "2026-07-31T12:00:00.000Z",
    ...overrides,
  }
}

function createSummary(): PeopleSummary {
  return {
    total: 1,
    active: 1,
    inactive: 0,
  }
}

function createSource(
  employees: readonly Employee[],
): PeopleExecutiveSource {
  return {
    async load() {
      return {
        summary: createSummary(),
        employees,
      }
    },
  }
}

test("retorna feed vazio quando não existem sinais executivos", async () => {
  const provider = new PeopleDecisionFeedProvider(
    generatedAt,
    createSource([
      createEmployee(),
    ]),
  )

  const feed = await provider.load()

  assert.equal(feed.generatedAt, generatedAt)
  assert.deepEqual(feed.items, [])
})

test("converte colaborador afastado em prioridade média", async () => {
  const provider = new PeopleDecisionFeedProvider(
    generatedAt,
    createSource([
      createEmployee({
        status: "on_leave",
      }),
    ]),
  )

  const item = (await provider.load()).items[0]

  assert.equal(item?.source, "people")
  assert.equal(item?.category, "people")
  assert.equal(item?.priority, "medium")
  assert.equal(item?.title, "Ana Souza")
  assert.equal(item?.href, "/app/people/employee-1")
})

test("converte colaborador desligado em prioridade alta", async () => {
  const provider = new PeopleDecisionFeedProvider(
    generatedAt,
    createSource([
      createEmployee({
        status: "terminated",
      }),
    ]),
  )

  const item = (await provider.load()).items[0]

  assert.equal(item?.priority, "high")
  assert.match(
    item?.description ?? "",
    /desligado/,
  )
})

test("ignora colaboradores ativos e inativos", async () => {
  const provider = new PeopleDecisionFeedProvider(
    generatedAt,
    createSource([
      createEmployee({
        id: "active",
        status: "active",
      }),
      createEmployee({
        id: "inactive",
        status: "inactive",
      }),
    ]),
  )

  const feed = await provider.load()

  assert.deepEqual(feed.items, [])
})
