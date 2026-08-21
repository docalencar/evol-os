import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { resolvePositionBackLink } from "./competency-return-context"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

const page = read("./page.tsx")
const cardSource = read(
  "../../../../features/organization/positions/components/position-competencies-card.tsx"
)
const overviewSource = read(
  "../../../../features/organization/positions/components/position-workspace-overview.tsx"
)
const positionPage = read("../company/positions/[id]/page.tsx")
const createDialog = read(
  "../../../../features/competencies/position-competencies/components/position-competency-create-dialog.tsx"
)
const competencyForm = read(
  "../../../../features/competencies/components/competency-form.tsx"
)
const competencyActions = [
  read("../../../../features/competencies/actions/create-competency-action.ts"),
  read("../../../../features/competencies/actions/update-competency-action.ts"),
].join("\n")

const positionId = "123e4567-e89b-42d3-a456-426614174000"
const companyId = "123e4567-e89b-42d3-a456-426614174001"
const competencyId = "123e4567-e89b-42d3-a456-426614174002"

async function renderCard(
  activeCompetencyIds: string[],
  assignedCompetencyIds: string[]
) {
  ;(
    globalThis as typeof globalThis & {
      React: typeof React
    }
  ).React = React

  const { PositionCompetenciesCard } = await import(
    "../../../../features/organization/positions/components/position-competencies-card"
  )

  return renderToStaticMarkup(
    React.createElement(PositionCompetenciesCard, {
      companyId,
      positionId,
      competencies: activeCompetencyIds.map((id) => ({
        id,
        company_id: companyId,
        name: "Comunicação",
        description: null,
        category: "behavioral" as const,
        expected_level: 3,
        weight: 3,
        active: true,
        created_at: "2026-08-21T00:00:00.000Z",
        updated_at: "2026-08-21T00:00:00.000Z",
      })),
      positionCompetencies: assignedCompetencyIds.map((id) => ({
        id: `assignment-${id}`,
        competency_id: id,
        expected_level: 3,
        weight: 3,
        required: false,
        competencies: { name: "Comunicação" },
      })),
    })
  )
}

test("the rendered Position CTA carries the exact contextual URL", async () => {
  const html = await renderCard([], [])
  const managementLink = html.match(
    /<a[^>]+href="([^"]+)"[^>]*>Gerenciar competências<\/a>/
  )

  assert.equal(
    managementLink?.[1],
    `/app/competencies?fromPositionId=${positionId}`
  )
  assert.doesNotMatch(managementLink?.[0] ?? "", /<button/)
})

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

test("an empty active catalog explains the optional creation path", async () => {
  const html = await renderCard([], [])

  assert.match(
    html,
    /Crie uma competência no catálogo da empresa para poder adicioná-la a este cargo\./
  )
  assert.match(html, /Nenhuma competência configurada/)
})

test("all active competencies assigned has an honest distinct explanation", async () => {
  const html = await renderCard([competencyId], [competencyId])

  assert.match(
    html,
    /Todas as competências disponíveis já estão associadas a este cargo\./
  )
  assert.doesNotMatch(html, /Crie uma competência no catálogo/)
})

test("the existing Add competency availability rule remains unchanged", () => {
  assert.match(createDialog, /disabled=\{\s*!hasAvailableCompetencies\s*\}/)
  assert.match(createDialog, /competency\.active/)
  assert.match(createDialog, /!linkedCompetencyIds\.has/)
  assert.match(cardSource, /PositionCompetencyCreateDialog/)
})

test("the bridge permits no generic redirect, inline creation or persistence", () => {
  const bridgeSource = `${cardSource}\n${overviewSource}\n${page}`

  assert.doesNotMatch(bridgeSource, /returnTo|redirectTo|externalUrl/)
  assert.doesNotMatch(cardSource, /<CompetencyCreateDialog/)
  assert.doesNotMatch(bridgeSource, /\.from\(|\.rpc\(|create_tenant_/)
  assert.doesNotMatch(
    bridgeSource,
    /configuração incompleta|cargo incompleto|falta configurar|você precisa concluir|erro|bloqueio/i
  )
})
