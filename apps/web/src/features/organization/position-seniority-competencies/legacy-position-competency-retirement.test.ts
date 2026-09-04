import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const exists = (path: string) => existsSync(new URL(path, import.meta.url))

const detailPage = read(
  "../../../app/(dashboard)/app/company/positions/[id]/page.tsx"
)
const positionsPage = read(
  "../../../app/(dashboard)/app/company/positions/page.tsx"
)
const positionTable = read("../positions/components/position-table.tsx")
const legacyIndex = read("../../competencies/position-competencies/index.ts")
const legacyRepository = read(
  "../../competencies/position-competencies/repositories/position-competency-repository.ts"
)
const matrixRepository = read(
  "./repositories/position-seniority-competency-repository.ts"
)

test("position management exposes only the canonical seniority matrix", () => {
  assert.match(detailPage, /<PositionSeniorityCompetencyMatrixSection/)
  assert.doesNotMatch(detailPage, /PositionCompetenciesCard/)
  assert.doesNotMatch(detailPage, /getManagementPositionCompetencies/)
  assert.doesNotMatch(positionsPage, /getManagementPositionCompetencies/)
  assert.doesNotMatch(positionsPage, /positionCompetencies/)
  assert.doesNotMatch(positionTable, /positionCompetencies/)
})

test("the legacy Position competency write surface is absent", () => {
  const removedPaths = [
    "../../competencies/position-competencies/actions/archive-position-competency-action.ts",
    "../../competencies/position-competencies/actions/create-position-competency-action.ts",
    "../../competencies/position-competencies/actions/update-position-competency-action.ts",
    "../../competencies/position-competencies/components/position-competency-create-dialog.tsx",
    "../../competencies/position-competencies/components/position-competency-form.tsx",
    "../../competencies/position-competencies/schemas/position-competency-schema.ts",
    "../positions/components/position-competencies-card.tsx",
  ]

  for (const path of removedPaths) assert.equal(exists(path), false, path)
  assert.doesNotMatch(
    `${legacyIndex}\n${legacyRepository}`,
    /createPositionCompetencyAction|updatePositionCompetencyAction|archivePositionCompetencyAction|create_position_competency_v1|update_position_competency_v1|archive_position_competency_v1/
  )
})

test("legacy reads remain available for downstream compatibility", () => {
  assert.match(legacyIndex, /getPositionCompetenciesByPosition/)
  assert.match(legacyIndex, /getPositionCompetencyById/)
  assert.match(legacyRepository, /findAll/)
  assert.match(legacyRepository, /findByPosition/)
  assert.match(legacyRepository, /findById/)
})

test("People and Development retain their product-critical competency reads", () => {
  const dashboardRepository = read(
    "../../dashboard-read/repositories/tenant-dashboard-read-repository.ts"
  )
  const peoplePage = read("../../../app/(dashboard)/app/people/[id]/page.tsx")
  const developmentDashboard = read(
    "../../development/services/get-development-executive-dashboard.ts"
  )

  assert.match(dashboardRepository, /get_tenant_competency_directory_v1/)
  assert.match(peoplePage, /getManagementCompetencyAssignments\(companyId\)/)
  assert.match(
    developmentDashboard,
    /getManagementCompetencyAssignments\(companyId\)/
  )
})

test("matrix mutations remain isolated behind canonical RPCs", () => {
  assert.match(matrixRepository, /set_tenant_position_seniority_competency_v1/)
  assert.match(matrixRepository, /clear_tenant_position_seniority_competency_v1/)
  assert.doesNotMatch(matrixRepository, /create_position_competency_v1/)
  assert.doesNotMatch(matrixRepository, /update_position_competency_v1/)
  assert.doesNotMatch(matrixRepository, /archive_position_competency_v1/)
  assert.doesNotMatch(matrixRepository, /\.from\(["']position_seniority_competencies["']\)/)
})
