import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { resolvePositionBackLink } from "./competency-return-context"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

const page = read("./page.tsx")
const overviewSource = read(
  "../../../../features/organization/positions/components/position-workspace-overview.tsx"
)
const positionPage = read("../company/positions/[id]/page.tsx")
const competencyForm = read(
  "../../../../features/competencies/components/competency-form.tsx"
)
const competencyActions = [
  read("../../../../features/competencies/actions/create-competency-action.ts"),
  read("../../../../features/competencies/actions/update-competency-action.ts"),
].join("\n")

const positionId = "123e4567-e89b-42d3-a456-426614174000"

test("every Position management entry preserves the same origin context", () => {
  assert.match(overviewSource, /positionId: string/)
  assert.match(
    overviewSource,
    /href=\{`\/app\/competencies\?fromPositionId=\$\{encodeURIComponent\(positionId\)\}`\}/
  )
  assert.match(positionPage, /<PositionWorkspaceOverview\s+positionId=\{position\.id\}/)
  assert.doesNotMatch(overviewSource, /href="\/app\/competencies"/)
})

test("valid, invalid and missing origins execute the narrow return contract", () => {
  assert.deepEqual(resolvePositionBackLink(positionId), {
    href: `/app/company/positions/${positionId}`,
    label: "Voltar para o cargo",
  })
  assert.equal(resolvePositionBackLink("abc"), null)
  assert.equal(resolvePositionBackLink(undefined), null)
})

test("the page awaits and consumes fromPositionId only for a contextual link", () => {
  assert.match(page, /const \{ fromPositionId \} = await searchParams/)
  assert.match(page, /resolvePositionBackLink\(fromPositionId\)/)
  assert.match(page, /\{backLink \? \(/)
  assert.doesNotMatch(page, /Voltar para empresa/)
})

test("catalog mutations preserve the current URL instead of navigating away", () => {
  assert.doesNotMatch(competencyForm, /router\.(push|replace)|redirect\(/)
  assert.doesNotMatch(competencyActions, /router\.(push|replace)|redirect\(/)
  assert.match(competencyActions, /revalidatePath\("\/app\/competencies"\)/)
})

test("the bridge permits no generic redirect, inline creation or persistence", () => {
  const bridgeSource = `${overviewSource}\n${page}`

  assert.doesNotMatch(bridgeSource, /returnTo|redirectTo|externalUrl/)
  assert.doesNotMatch(bridgeSource, /\.from\(|\.rpc\(|create_tenant_/)
  assert.doesNotMatch(
    bridgeSource,
    /configuração incompleta|cargo incompleto|falta configurar|você precisa concluir|erro|bloqueio/i
  )
})
