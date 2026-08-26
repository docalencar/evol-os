import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import test from "node:test"

const srcRoot = path.resolve(__dirname, "../../..")

function read(relativePath: string): string {
  return fs.readFileSync(path.join(srcRoot, relativePath), "utf8")
}

const personPage = read("app/(dashboard)/app/people/[id]/page.tsx")
const readModels = read(
  "features/assessment-feedback-read/queries/get-assessment-feedback-read-models.ts"
)
const repository = read(
  "features/assessment-feedback-read/repositories/assessment-feedback-read-repository.ts"
)

test("the Person page consumes the 0118 boundary and anchors the section", () => {
  assert.match(personPage, /getPersonAssessmentResultDirectoryReadModel\(companyId, id\)/)
  assert.match(personPage, /id="ultimas-avaliacoes"/)
  assert.match(personPage, /<EmployeeRecentAssessmentResultsCard/)
})

test("the Person page never calls the administrative RPC directly", () => {
  // A página fala com o read model; o nome do RPC só existe no repositório.
  assert.doesNotMatch(personPage, /get_tenant_person_assessment_result_directory_v1/)
  assert.match(repository, /get_tenant_person_assessment_result_directory_v1/)
})

test("the read model checks the administrative role before calling the RPC", () => {
  const guardIndex = readModels.indexOf("if (!isAdministrativeRole(actor.role)) return { status: \"forbidden\" }")
  const callIndex = readModels.indexOf("personResultDirectory(")

  assert.ok(guardIndex > 0, "guard de papel administrativo ausente")
  assert.ok(callIndex > 0, "chamada ao repositório ausente")
  assert.ok(
    guardIndex < callIndex,
    "o papel precisa ser conferido antes da chamada, para não gerar negação e auditoria a cada render"
  )
})

test("the read model distinguishes forbidden from unavailable from empty", () => {
  assert.match(readModels, /status: "forbidden"/)
  assert.match(readModels, /status: "unavailable"/)
  assert.match(readModels, /status: "ok"/)
  // Colapsar qualquer um deles em lista vazia faria a superfície afirmar um
  // histórico que ela não leu.
  assert.doesNotMatch(readModels, /catch[\s\S]{0,120}return \{ status: "ok", rows: \[\] \}/)
})

test("the Person page hides the section only for forbidden, not for empty", () => {
  assert.match(personPage, /personAssessmentResults\.status === "forbidden" \? null/)
  assert.match(personPage, /isUnavailable=\{personAssessmentResults\.status === "unavailable"\}/)
})

test("exactly one shared definition of the directory perspective labels", () => {
  const labelFiles = [
    "features/assessments/presenters/assessment-perspective-labels.ts",
    "features/assessments/presenters/assessment-result-directory-presenter.ts",
    "features/people/assessments/presenters/person-assessment-results-presenter.ts",
  ].map(read)

  const definitions = labelFiles.filter((source) =>
    /"Histórico — perspectiva não identificada"/.test(source)
  )

  assert.equal(definitions.length, 1, "o rótulo de perspectiva foi duplicado")
  assert.match(labelFiles[1], /DIRECTORY_PERSPECTIVE_LABELS/)
  assert.match(labelFiles[2], /DIRECTORY_PERSPECTIVE_LABELS/)
})
