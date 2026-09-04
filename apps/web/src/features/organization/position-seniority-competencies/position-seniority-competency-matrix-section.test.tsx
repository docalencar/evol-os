import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { PositionSeniorityCompetencyMatrixSection } from "./components/position-seniority-competency-matrix-section"
import type { CompetencyMatrixCellViewModel } from "./presenters/present-position-seniority-competency-matrix"

(globalThis as typeof globalThis & { React: typeof React }).React = React

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const detailPage = read(
  "../../../app/(dashboard)/app/company/positions/[id]/page.tsx"
)
const repository = read("./repositories/position-seniority-competency-repository.ts")
const section = read("./components/position-seniority-competency-matrix-section.tsx")
const successfulAction = async () => ({ success: true, message: "OK" })

function cell(
  partial: Partial<CompetencyMatrixCellViewModel> &
    Pick<CompetencyMatrixCellViewModel, "positionSeniorityProfileId" | "state">
): CompetencyMatrixCellViewModel {
  const { positionSeniorityProfileId, state, ...overrides } = partial
  const stateLabels = {
    base: "Base",
    inherited: "Herdado do Base",
    override: "Personalizado",
    none: "Não definido",
  } as const

  return {
    positionSeniorityProfileId,
    seniorityLevelId: null,
    isBaseProfile: false,
    profileActive: true,
    competencyId: "competency-1",
    state,
    stateLabel: stateLabels[state],
    source: state === "override" ? "override" : state === "none" ? "none" : "base",
    inherited: state === "inherited",
    expectedLevel: state === "none" ? null : 3,
    expectedLevelLabel: state === "none" ? null : "Proficiente",
    weight: state === "none" ? null : 4,
    weightLabel: state === "none" ? null : "Alta",
    required: state === "none" ? null : true,
    type: state === "none" ? null : "core",
    typeLabel: state === "none" ? null : "Essencial",
    notes: null,
    baseRowId: null,
    overrideRowId: null,
    ...overrides,
  }
}

test("Position detail uses the 4B-1 query and keeps the legacy competency card", () => {
  assert.match(detailPage, /getPositionSeniorityCompetencyMatrix\(companyId, positionId\)/)
  assert.match(detailPage, /<PositionSeniorityCompetencyMatrixSection/)
  assert.match(detailPage, /<PositionCompetenciesCard/)
  assert.doesNotMatch(detailPage, /\.from\("position_seniority_competencies"\)/)
})

test("the UI has no direct table access and keeps RPC details in the repository", () => {
  for (const source of [detailPage, repository, section]) {
    assert.doesNotMatch(source, /\.from\("position_seniority_competencies"\)/)
    assert.doesNotMatch(source, /createBrowserClient|service_role/)
  }
  for (const source of [detailPage, section]) {
    assert.doesNotMatch(source, /set_tenant_position_seniority_competency_v1/)
    assert.doesNotMatch(source, /clear_tenant_position_seniority_competency_v1/)
  }
})

test("Base precedes ordered seniorities and states use canonical semantic labels", () => {
  const html = renderToStaticMarkup(
    <PositionSeniorityCompetencyMatrixSection
      positionId="00000000-0000-4000-8000-000000000001"
      setAction={successfulAction}
      clearAction={successfulAction}
      competencies={[{ id: "competency-1", name: "Comunicação" }]}
      seniorities={[
        { profileId: "junior", code: "JR", label: "Júnior" },
        { profileId: "senior", code: "SR", label: "Sênior" },
      ]}
      matrix={{
        cells: [
          cell({ positionSeniorityProfileId: "base", state: "base", isBaseProfile: true }),
          cell({ positionSeniorityProfileId: "junior", state: "inherited" }),
          cell({ positionSeniorityProfileId: "senior", state: "override" }),
        ],
      }}
    />
  )

  assert.ok(html.indexOf("Base") < html.indexOf("Júnior"))
  assert.ok(html.indexOf("Júnior") < html.indexOf("Sênior"))
  assert.match(html, /Herdado do Base/)
  assert.match(html, /Personalizado/)
  assert.match(html, /Proficiente/)
  assert.match(html, /Alta/)
  assert.match(html, /Essencial/)
  assert.doesNotMatch(html, /Nível esperado: 3|Peso 4/)
})

test("undefined cells render Não definido without fabricated values", () => {
  const html = renderToStaticMarkup(
    <PositionSeniorityCompetencyMatrixSection
      positionId="00000000-0000-4000-8000-000000000001"
      setAction={successfulAction}
      clearAction={successfulAction}
      competencies={[{ id: "competency-1", name: "Comunicação" }]}
      seniorities={[]}
      matrix={{
        cells: [
          cell({
            positionSeniorityProfileId: "base",
            state: "none",
            isBaseProfile: true,
          }),
        ],
      }}
    />
  )

  assert.match(html, /Não definido/)
  assert.doesNotMatch(html, /Proficiente|Alta|Essencial/)
})

test("empty states distinguish missing profiles from an empty effective row-set", () => {
  const withoutProfiles = renderToStaticMarkup(
    <PositionSeniorityCompetencyMatrixSection
      positionId="00000000-0000-4000-8000-000000000001"
      setAction={successfulAction}
      clearAction={successfulAction}
      competencies={[]}
      seniorities={[]}
      matrix={{ cells: [] }}
    />
  )
  const withoutCompetencies = renderToStaticMarkup(
    <PositionSeniorityCompetencyMatrixSection
      positionId="00000000-0000-4000-8000-000000000001"
      setAction={successfulAction}
      clearAction={successfulAction}
      competencies={[]}
      seniorities={[{ profileId: "junior", code: "JR", label: "Júnior" }]}
      matrix={{ cells: [] }}
    />
  )

  assert.match(withoutProfiles, /Nenhuma senioridade ativa para comparar/)
  assert.match(withoutCompetencies, /Nenhuma competência na matriz/)
})
