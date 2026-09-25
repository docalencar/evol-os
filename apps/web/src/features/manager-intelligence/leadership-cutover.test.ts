import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import { presentAttentionQueue } from "./presenters/attention-queue-presenter"
import { createLeadershipAttentionRepositoryAdapter } from "./repositories/leadership-attention-repository-adapter"
import type {
  AttentionItem,
  AttentionReasonType,
} from "./types/attention-item"

const subjectId = "11111111-1111-4111-8111-111111111111"
const assessmentId = "22222222-2222-4222-8222-222222222222"
const planId = "33333333-3333-4333-8333-333333333333"
const companyId = "44444444-4444-4444-8444-444444444444"

function item(
  reason: AttentionReasonType,
  overrides: Partial<AttentionItem> = {}
): AttentionItem {
  const developmentReason = reason.startsWith("development_")
  const missing = reason === "development_plan_missing"

  return {
    subjectId,
    subjectName: "Pessoa direta",
    subjectStatus: "active",
    reason,
    priority: missing ? "low" : reason.endsWith("overdue") ? "high" : "medium",
    sourceType: missing
      ? "development_subject"
      : developmentReason
        ? "development_plan"
        : "assessment_response",
    sourceId: missing ? subjectId : developmentReason ? planId : assessmentId,
    sourceStatus: missing ? "missing" : developmentReason ? "active" : "in_progress",
    dueDate: reason.includes("follow_up") || reason.includes("assessment")
      ? "2026-09-30"
      : null,
    sourceVersion: developmentReason && !missing ? 4 : null,
    sourceUpdatedAt: "2026-09-24T12:00:00Z",
    ...overrides,
  }
}

test("all six factual reasons route to their exact owning workflow", () => {
  const reasons: AttentionReasonType[] = [
    "assigned_assessment_overdue",
    "assigned_assessment_pending",
    "formal_feedback_pending",
    "development_follow_up_overdue",
    "development_follow_up_due",
    "development_plan_missing",
  ]
  const result = presentAttentionQueue(reasons.map((reason) => item(reason)))

  assert.deepEqual(
    result.items.map(({ reasonType, actionHref }) => ({ reasonType, actionHref })),
    [
      { reasonType: reasons[0], actionHref: `/app/assessments/responses/${assessmentId}` },
      { reasonType: reasons[1], actionHref: `/app/assessments/responses/${assessmentId}` },
      { reasonType: reasons[2], actionHref: `/app/assessments/responses/${assessmentId}` },
      { reasonType: reasons[3], actionHref: `/app/development/plans/${planId}` },
      { reasonType: reasons[4], actionHref: `/app/development/plans/${planId}` },
      { reasonType: reasons[5], actionHref: `/app/development?applyFor=${subjectId}` },
    ]
  )
})

test("presentation remains factual and keeps multiple reasons separate", () => {
  const result = presentAttentionQueue([
    item("assigned_assessment_pending"),
    item("formal_feedback_pending"),
  ])

  assert.equal(result.total, 2)
  assert.equal(result.items.length, 2)
  assert.equal(result.items[0]?.subjectName, "Pessoa direta")
  assert.equal(result.items[0]?.priorityLabel, "Média")
  assert.equal(result.items[0]?.sourceStatusLabel, "Em andamento")
  assert.equal(result.items[0]?.dueDateLabel, "30/09/2026")
  assert.notEqual(result.items[0]?.id, result.items[1]?.id)
  assert.equal("healthScore" in result.items[0]!, false)
  assert.equal("decisionScore" in result.items[0]!, false)
  assert.equal("decisionSummary" in result.items[0]!, false)
})

test("an authoritative empty result is represented only as an empty queue", () => {
  assert.deepEqual(presentAttentionQueue([]), {
    items: [],
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    empty: true,
  })
})

test("the canonical read calls the trusted RPC and maps every returned field", async () => {
  const calls: unknown[] = []
  const repository = createLeadershipAttentionRepositoryAdapter({
    async rpc(name, parameters) {
      calls.push({ name, parameters })
      return {
        data: [
          {
            subject_id: subjectId,
            subject_name: "Pessoa direta",
            subject_status: "on_leave",
            reason: "development_follow_up_overdue",
            priority: "high",
            source_type: "development_plan",
            source_id: planId,
            source_status: "active",
            due_date: "2026-09-30",
            source_version: 4,
            source_updated_at: "2026-09-24T12:00:00Z",
          },
        ],
        error: null,
      }
    },
  })

  const result = await repository.findForCurrentManager(companyId)

  assert.deepEqual(calls, [
    {
      name: "get_manager_leadership_attention_v1",
      parameters: { p_company_id: companyId },
    },
  ])
  assert.deepEqual(result, [
    {
      subjectId,
      subjectName: "Pessoa direta",
      subjectStatus: "on_leave",
      reason: "development_follow_up_overdue",
      priority: "high",
      sourceType: "development_plan",
      sourceId: planId,
      sourceStatus: "active",
      dueDate: "2026-09-30",
      sourceVersion: 4,
      sourceUpdatedAt: "2026-09-24T12:00:00Z",
    },
  ])
})

test("a boundary failure is never presented as an empty queue", async () => {
  const repository = createLeadershipAttentionRepositoryAdapter({
    async rpc() {
      return { data: null, error: { message: "permission denied" } }
    },
  })

  await assert.rejects(
    repository.findForCurrentManager(companyId),
    /LEADERSHIP_ATTENTION_READ_FAILED: permission denied/
  )
})

test("an unrecognised readback fails closed instead of degrading", async () => {
  const repository = createLeadershipAttentionRepositoryAdapter({
    async rpc() {
      // A reason outside the six frozen ones must not survive into the queue.
      return {
        data: [{ subject_id: subjectId, reason: "competency_gap" }],
        error: null,
      }
    },
  })

  await assert.rejects(
    repository.findForCurrentManager(companyId),
    /LEADERSHIP_ATTENTION_INVALID_READBACK/
  )
})

test("an authoritative empty read stays empty rather than becoming a failure", async () => {
  const repository = createLeadershipAttentionRepositoryAdapter({
    async rpc() {
      return { data: [], error: null }
    },
  })

  assert.deepEqual(await repository.findForCurrentManager(companyId), [])
})

test("the retired company-wide intelligence path is no longer consumed", () => {
  const read = (path: string) =>
    readFileSync(new URL(path, import.meta.url), "utf8")

  const active = [
    read("./repositories/leadership-attention-repository.ts"),
    read("./repositories/leadership-attention-repository-adapter.ts"),
    read("./queries/get-attention-queue.ts"),
    read("./index.ts"),
    read("../../app/(dashboard)/app/manager/page.tsx"),
  ].join("\n")

  assert.doesNotMatch(active, /\.from\(["']people["']\)/)
  assert.doesNotMatch(active, /getEmployeeIntelligenceList|getManagementPeople/)
  assert.doesNotMatch(active, /createAttentionQueue/)
  assert.match(active, /get_manager_leadership_attention_v1/)

  // The obsolete fabricator is gone, not merely unreferenced.
  assert.throws(() => read("./services/create-attention-queue.ts"))
})

test("UI and navigation expose Leadership without legacy intelligence claims", () => {
  const component = readFileSync(
    new URL("./components/attention-queue/attention-queue.tsx", import.meta.url),
    "utf8"
  )
  const sidebar = readFileSync(
    new URL("../../components/layout/sidebar.tsx", import.meta.url),
    "utf8"
  )
  const errorBoundary = readFileSync(
    new URL("../../app/(dashboard)/app/manager/error.tsx", import.meta.url),
    "utf8"
  )

  assert.match(sidebar, /href: "\/app\/manager", label: "Liderança"/)
  assert.match(component, /Nenhum item de atenção no momento/)
  assert.doesNotMatch(component, /Health Score|Decision Score|Situação estável|reconhecimento/i)
  assert.match(errorBoundary, /não foi substituída por um resultado vazio/i)
})

test("missing-PDI routing preselects only an owning-domain eligible target", () => {
  const page = readFileSync(
    new URL("../../app/(dashboard)/app/development/page.tsx", import.meta.url),
    "utf8"
  )
  const dialog = readFileSync(
    new URL(
      "../development/templates/components/apply-development-template-dialog.tsx",
      import.meta.url
    ),
    "utf8"
  )

  assert.match(page, /applicationPresentation\?\.targets\.some/)
  assert.match(page, /initialEmployeeId=\{requestedEmployeeId\}/)
  assert.match(dialog, /useState\(initialEmployeeId\)/)
  assert.match(dialog, /checkDevelopmentTemplateApplicationReadinessAction/)
  assert.match(dialog, /confirmDevelopmentTemplateApplicationAction/)
})
