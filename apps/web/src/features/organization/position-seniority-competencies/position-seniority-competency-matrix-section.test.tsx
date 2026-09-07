import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import { hasOwnExpectation } from "./components/add-position-seniority-competency-dialog"
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
const addDialog = read("./components/add-position-seniority-competency-dialog.tsx")
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

test("Position detail uses the canonical matrix without the legacy competency card", () => {
  assert.match(detailPage, /getPositionSeniorityCompetencyMatrix\(companyId, positionId\)/)
  assert.match(detailPage, /<PositionSeniorityCompetencyMatrixSection/)
  assert.doesNotMatch(detailPage, /<PositionCompetenciesCard/)
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

/**
 * ZERO-STATE REACHABILITY
 *
 * A mutation-backed capability is not implemented until the FIRST record can be
 * created from a zero-row state. The matrix editor only ever opened from an
 * existing cell, and cells only exist for competencies that already have a row,
 * so the first expectation was unreachable: no row -> no cell -> no editor ->
 * no row. These tests pin the front door open at both ends of that cycle.
 */

const ADD_TRIGGER = /Adicionar competência à matriz/

test("zero-row state still offers a way to create the first expectation", () => {
  const html = renderToStaticMarkup(
    <PositionSeniorityCompetencyMatrixSection
      positionId="00000000-0000-4000-8000-000000000001"
      setAction={successfulAction}
      clearAction={successfulAction}
      competencies={[{ id: "competency-1", name: "Comunicação" }]}
      seniorities={[]}
      baseProfileId="base"
      matrix={{ cells: [] }}
    />
  )

  // The regression this guards: an add affordance rendered only beside existing
  // cells would leave the empty state exactly as broken as it was.
  assert.match(html, ADD_TRIGGER)
  assert.match(html, /Use “Adicionar competência à matriz” para criar a primeira/)
})

test("the first expectation is reachable from Base alone, with no seniority applied", () => {
  const html = renderToStaticMarkup(
    <PositionSeniorityCompetencyMatrixSection
      positionId="00000000-0000-4000-8000-000000000001"
      setAction={successfulAction}
      clearAction={successfulAction}
      competencies={[{ id: "competency-1", name: "Comunicação" }]}
      seniorities={[]}
      baseProfileId="base"
      matrix={{ cells: [] }}
    />
  )

  assert.match(html, ADD_TRIGGER)
})

test("populated state keeps the add affordance alongside the editable cells", () => {
  const html = renderToStaticMarkup(
    <PositionSeniorityCompetencyMatrixSection
      positionId="00000000-0000-4000-8000-000000000001"
      setAction={successfulAction}
      clearAction={successfulAction}
      competencies={[{ id: "competency-1", name: "Comunicação" }]}
      seniorities={[{ profileId: "junior", code: "JR", label: "Júnior" }]}
      baseProfileId="base"
      matrix={{
        cells: [
          cell({ positionSeniorityProfileId: "base", state: "base", isBaseProfile: true }),
          cell({ positionSeniorityProfileId: "junior", state: "inherited" }),
        ],
      }}
    />
  )

  assert.match(html, ADD_TRIGGER)
  // Existing cell editing must not regress: the cell triggers are still there.
  assert.match(html, /Editar Comunicação no perfil Base/)
  assert.match(html, /Editar Comunicação no perfil Júnior/)
})

test("no add affordance is faked when there is nothing valid to add", () => {
  const withoutCompetencies = renderToStaticMarkup(
    <PositionSeniorityCompetencyMatrixSection
      positionId="00000000-0000-4000-8000-000000000001"
      setAction={successfulAction}
      clearAction={successfulAction}
      competencies={[]}
      seniorities={[]}
      baseProfileId="base"
      matrix={{ cells: [] }}
    />
  )
  const withoutAnyProfile = renderToStaticMarkup(
    <PositionSeniorityCompetencyMatrixSection
      positionId="00000000-0000-4000-8000-000000000001"
      setAction={successfulAction}
      clearAction={successfulAction}
      competencies={[{ id: "competency-1", name: "Comunicação" }]}
      seniorities={[]}
      baseProfileId={null}
      matrix={{ cells: [] }}
    />
  )

  assert.doesNotMatch(withoutCompetencies, ADD_TRIGGER)
  assert.match(withoutCompetencies, /Cadastre competências no catálogo da empresa/)
  assert.doesNotMatch(withoutAnyProfile, ADD_TRIGGER)
})

test("the add dialog writes through the existing canonical action contract", () => {
  // Same server action, same field set as the cell editor — one write boundary.
  assert.match(addDialog, /setAction\(\{/)
  for (const field of [
    "positionId",
    "profileId",
    "competencyId",
    "expectedLevel",
    "weight",
    "required",
    "type",
    "notes",
  ]) {
    assert.match(addDialog, new RegExp(`\\b${field}\\b`))
  }

  // No second write path, no legacy expectation model, no direct table access.
  assert.doesNotMatch(addDialog, /position_competencies/)
  assert.doesNotMatch(addDialog, /set_tenant_position_seniority_competency_v1/)
  assert.doesNotMatch(addDialog, /\.from\(/)
  assert.doesNotMatch(addDialog, /createBrowserClient|service_role/)
})

test("a competency already owning a row on that profile is not offered as an add", () => {
  const cells = [
    cell({
      positionSeniorityProfileId: "base",
      state: "base",
      isBaseProfile: true,
      competencyId: "competency-1",
      baseRowId: "row-base-1",
    }),
    cell({
      positionSeniorityProfileId: "junior",
      state: "inherited",
      competencyId: "competency-1",
      baseRowId: "row-base-1",
    }),
  ]

  // Base owns a row -> excluded, so "add" can never silently overwrite.
  assert.equal(hasOwnExpectation(cells, "base", "competency-1"), true)

  // Júnior only inherits; creating its own override there is a genuine create.
  assert.equal(hasOwnExpectation(cells, "junior", "competency-1"), false)

  // A competency absent from the matrix is always addable.
  assert.equal(hasOwnExpectation(cells, "base", "competency-2"), false)
})
