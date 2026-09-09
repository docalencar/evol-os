import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"

import { presentAssessmentPriority } from "./presenters/assessment-priority-presenter"
import { presentAssessments } from "./presenters/assessment-presenter"
import type { AssessmentCycle } from "./types/assessment-cycle"
import type { AssessmentResponse } from "./types/assessment-response"

/**
 * The evaluator inbox — the gap this file exists to keep closed.
 *
 * The backend never withheld an evaluator's own work: the policy "evaluators
 * read own assessment responses" (0062:307) restricts the read to
 * `evaluator_id = current_person_id(company_id)`, and the response page checks
 * the same thing. What was missing was any way to FIND it. The assessment home
 * loaded the evaluator workspace only for administrators and returned early for
 * everyone else with nothing but past results, so an ordinary evaluator with an
 * assessment waiting had no link to it anywhere in the product.
 *
 * ## Why this is split between behaviour and structure
 *
 * The chain that decides what an evaluator is offered is pure: responses and
 * cycles in, a priority object out, and it is asserted directly. Rendering the
 * card on top of it would add nothing and cannot run here anyway —
 * `AssessmentHome` imports the feature barrel, which reaches `server-only`, and
 * the leaf card relies on the automatic JSX runtime Next supplies but this
 * runner does not. The wiring that feeds the chain is therefore proven against
 * the source of the two server files. Both halves are needed: a presenter that
 * works proves nothing if the page never loads the data.
 */

const root = path.resolve(__dirname, "../..")
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

const COMPANY = "10000000-0000-4000-8000-000000000001"
const CYCLE = "20000000-0000-4000-8000-000000000002"
const RESPONSE = "30000000-0000-4000-8000-000000000003"
const PERSON = "40000000-0000-4000-8000-000000000004"

function openCycle(overrides: Partial<AssessmentCycle> = {}): AssessmentCycle {
  return {
    id: CYCLE,
    company_id: COMPANY,
    name: "Ciclo de avaliação anual",
    description: null,
    assessment_type: "performance",
    status: "active",
    assessment_template_id: "50000000-0000-4000-8000-000000000005",
    start_date: "2026-09-01",
    end_date: "2026-09-30",
    close_date: null,
    allow_self_assessment: true,
    allow_manager_assessment: false,
    allow_peer_assessment: false,
    allow_direct_report_assessment: false,
    anonymous: false,
    assessment_visibility: "none",
    ...overrides,
  } as AssessmentCycle
}

function response(overrides: Partial<AssessmentResponse> = {}): AssessmentResponse {
  return {
    id: RESPONSE,
    company_id: COMPANY,
    assessment_cycle_id: CYCLE,
    assessment_template_id: "50000000-0000-4000-8000-000000000005",
    employee_id: PERSON,
    evaluator_id: PERSON,
    status: "draft",
    perspective: "self",
    ...overrides,
  } as AssessmentResponse
}

/** Exactly the chain the non-administrative branch of the home runs. */
function pendingWork(
  cycles: AssessmentCycle[],
  evaluatorResponses: AssessmentResponse[]
) {
  return presentAssessmentPriority(presentAssessments(cycles, evaluatorResponses))
}

describe("evaluator pending work", () => {
  it("names the assessment waiting for the evaluator and offers to open it", () => {
    const priority = pendingWork([openCycle()], [response()])

    assert.ok(priority, "an open response must produce pending work")
    assert.match(priority.message, /Ciclo de avaliação anual/)
    assert.equal(priority.actionLabel, "Abrir avaliação")
  })

  it("links to the canonical response surface, never to the administrative cycle page", () => {
    const priority = pendingWork([openCycle()], [response()])

    assert.equal(priority?.href, `/app/assessments/responses/${RESPONSE}`)
    assert.notEqual(priority?.href, `/app/assessments/cycles/${CYCLE}`)
  })

  it("offers nothing at all when the evaluator has no open work", () => {
    // The page hands this branch no cycles when nothing is open, and the card
    // renders null for a null priority — so an evaluator with nothing pending
    // sees exactly the page they saw before this change.
    assert.equal(pendingWork([], []), null)
  })

  it("offers no CTA for work that is already submitted", () => {
    const priority = pendingWork([openCycle()], [response({ status: "submitted" })])
    assert.equal(priority?.actionLabel, undefined)
    assert.equal(priority?.href, undefined)
  })

  it("never turns another cycle's response into a CTA for this one", () => {
    // Defence in depth against a future caller that stops scoping the query:
    // the presenter keys actionable work by cycle, so a response belonging
    // somewhere else produces no CTA here.
    const priority = pendingWork(
      [openCycle()],
      [response({ assessment_cycle_id: "99999999-0000-4000-8000-000000000009" })]
    )
    assert.equal(priority?.actionLabel, undefined)
    assert.equal(priority?.href, undefined)
  })
})

describe("evaluator inbox wiring — the server page", () => {
  const page = read("app/(dashboard)/app/assessments/page.tsx")

  it("reads the evaluator's own work for any person, not only administrators", () => {
    // The regression this guards is the original gate,
    // `if (canManageAssessments && personId)`. Matched in either operand order
    // and without depending on whitespace.
    const guardedByRole =
      /if\s*\(\s*canManageAssessments\s*&&\s*personId\s*\)/.test(page) ||
      /if\s*\(\s*personId\s*&&\s*canManageAssessments\s*\)/.test(page)

    assert.equal(
      guardedByRole,
      false,
      "loading the evaluator workspace must not require an administrative role"
    )
    assert.match(page, /if\s*\(\s*personId\s*\)/)
    assert.match(page, /findByEvaluator\(/)
  })

  it("takes the evaluator id from the server session, never from the caller", () => {
    assert.match(page, /getCurrentCompanyContext\(\)/)
    assert.doesNotMatch(page, /searchParams|params\.|headers\(\)|cookies\(\)/)
  })

  it("keeps the administrative catalog administrative", () => {
    assert.match(page, /canManageAssessments[\s\S]{0,40}getAssessmentCatalogReadModel/)
  })

  it("gives a non-administrator only the cycles their own OPEN responses point at", () => {
    assert.match(page, /if\s*\(\s*!canManageAssessments\s*\)/)
    assert.match(page, /"draft"[\s\S]{0,60}"in_progress"/)
    assert.match(page, /findByIds\(/)
  })
})

describe("evaluator inbox wiring — the home component", () => {
  const home = read("features/assessments/components/home/assessment-home.tsx")

  it("no longer returns only the result directory for a non-administrator", () => {
    assert.doesNotMatch(
      home,
      /if\s*\(\s*!canManageAssessments\s*\)\s*\{\s*\n\s*return <div className="space-y-8">\{resultDirectorySection\}<\/div>/
    )
    assert.match(home, /AssessmentPriorityCard priority=\{pendingWork\}/)
    assert.match(home, /presentAssessmentPriority\(/)
  })

  it("shows a non-administrator their pending work and their results, and nothing else", () => {
    const branch = home.slice(
      home.indexOf("if (!canManageAssessments)"),
      home.indexOf("const assessments =")
    )
    assert.ok(branch.length > 0, "the non-administrative branch must still exist")
    assert.match(branch, /AssessmentPriorityCard/)
    assert.match(branch, /resultDirectorySection/)

    // Every administrative surface must live AFTER this branch returns.
    for (const administrative of [
      "AssessmentHero",
      "ProductActionPanel",
      "AssessmentCycleTable",
      "AssessmentTemplateTable",
      "AssessmentTemplateCreateDialog",
      "AssessmentCycleCreateDialog",
      "NextStepCard",
    ]) {
      assert.equal(
        branch.includes(administrative),
        false,
        `a non-administrator must not reach ${administrative}`
      )
      assert.ok(
        home.includes(administrative),
        `${administrative} must still exist for administrators`
      )
    }
  })

  it("reuses the existing presenter instead of a parallel component", () => {
    assert.match(home, /presentAssessments\(cycles, evaluatorResponses\)/)
    // No second priority card was introduced next to the one that already works,
    // and that card still renders nothing for a null priority.
    const files = fs.readdirSync(
      path.join(root, "features/assessments/components/home")
    )
    assert.deepEqual(
      files.filter((name) => name.includes("priority")),
      ["assessment-priority-card.tsx"]
    )
    const card = read("features/assessments/components/home/assessment-priority-card.tsx")
    assert.match(card, /if \(!priority\) \{\s*\n\s*return null/)
  })
})
