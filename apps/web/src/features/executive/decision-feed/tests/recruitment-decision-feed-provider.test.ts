import assert from "node:assert/strict"
import test from "node:test"

import type { JobOpening } from "@/features/recruitment/job-openings/types/job-opening"

import {
  RecruitmentDecisionFeedProvider,
  type JobOpeningSource,
} from "../adapters"

const generatedAt = "2026-08-01T12:00:00.000Z"

function createSource(
  openings: readonly JobOpening[],
): JobOpeningSource {
  return {
    async load() {
      return openings
    },
  }
}

function createJobOpening(
  overrides: Partial<JobOpening> = {},
): JobOpening {
  return {
    id: "job-1",
    companyId: "company-1",
    title: "Desenvolvedor Backend",
    description: "Descrição da vaga",
    departmentId: "department-1",
    positionId: "position-1",
    requestingManagerId: "manager-1",
    recruiterId: null,
    openingReason: "headcount_growth",
    replacedEmployeeId: null,
    openingJustification:
      "Ampliação do quadro da área de tecnologia.",
    positionsCount: 1,
    currentHeadcount: 10,
    targetHeadcount: 11,
    workModel: "hybrid",
    location: null,
    employmentType: "clt",
    salaryMin: null,
    salaryMax: null,
    status: "approved",
    priority: "high",
    targetHireDate: null,
    approverId: null,
    approvedAt: null,
    notes: null,
    estimatedMonthlyCost: null,
    isBudgeted: true,
    createdByUserId: "user-1",
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T10:00:00.000Z",
    deletedAt: null,
    ...overrides,
  }
}

test("retorna feed vazio quando não existem vagas", async () => {
  const provider =
    new RecruitmentDecisionFeedProvider(
      generatedAt,
      createSource([]),
    )

  const feed = await provider.load()

  assert.deepEqual(feed.items, [])
})

test("converte vaga em item do Decision Feed", async () => {
  const provider =
    new RecruitmentDecisionFeedProvider(
      generatedAt,
      createSource([
        createJobOpening(),
      ]),
    )

  const feed = await provider.load()

  assert.equal(feed.items.length, 1)
  assert.equal(feed.items[0]?.source, "recruitment")
  assert.equal(feed.items[0]?.priority, "high")
  assert.equal(feed.items[0]?.category, "people")

  assert.equal(
    feed.items[0]?.href,
    "/app/recruitment/job-openings/job-1",
  )
})

test("vagas aguardando aprovação viram categoria approval", async () => {
  const provider =
    new RecruitmentDecisionFeedProvider(
      generatedAt,
      createSource([
        createJobOpening({
          status: "pending_approval",
        }),
      ]),
    )

  const feed = await provider.load()

  assert.equal(
    feed.items[0]?.category,
    "approval",
  )
})

test("prioridade urgent gera prioridade crítica", async () => {
  const provider =
    new RecruitmentDecisionFeedProvider(
      generatedAt,
      createSource([
        createJobOpening({
          priority: "urgent",
        }),
      ]),
    )

  const feed = await provider.load()

  assert.equal(
    feed.items[0]?.priority,
    "critical",
  )
})