import fs from "node:fs"
import path from "node:path"
import assert from "node:assert/strict"
import { describe, it } from "node:test"

const root = path.resolve(__dirname, "../..")
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

describe("assessment scored result wiring", () => {
  it("uses the trusted normalized read for submitted Response feedback", () => {
    const page = read("app/(dashboard)/app/assessments/responses/[id]/page.tsx")
    assert.match(page, /getAssessmentScoredResultReadModel/)
    assert.doesNotMatch(page, /getAssessmentFeedback\(/)
  })

  it("does not present legacy raw Cycle or execution averages as official results", () => {
    const cycle = read("app/(dashboard)/app/assessments/cycles/[id]/page.tsx")
    const insights = read("features/assessments/components/assessment-execution/assessment-smart-insights-card.tsx")
    assert.doesNotMatch(cycle, /AssessmentStatisticsCard/)
    assert.doesNotMatch(insights, /Nota média/)
  })
})
