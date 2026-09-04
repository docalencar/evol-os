import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import {
  proficiencyLabel,
  weightLabel,
  competencyTypeLabel,
  PROFICIENCY_LABELS,
  WEIGHT_LABELS,
  COMPETENCY_TYPE_LABELS,
} from "@/features/competencies/constants/competency-scale"

import { presentPositionSeniorityCompetencyMatrix } from "./presenters/present-position-seniority-competency-matrix"
import type { PositionSeniorityCompetencyCell } from "./types/position-seniority-competency-cell"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read(
  "./repositories/position-seniority-competency-repository.ts"
)
const presenter = read(
  "./presenters/present-position-seniority-competency-matrix.ts"
)
const query = read("./queries/get-position-seniority-competency-matrix.ts")

// --------------------------------------------------------------------------
// Canonical scale semantics.
// --------------------------------------------------------------------------
test("proficiency labels 1..5 are the canonical PD-021 labels", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((n) => proficiencyLabel(n)),
    ["Inicial", "Básico", "Proficiente", "Avançado", "Referência"]
  )
  assert.equal(PROFICIENCY_LABELS[3], "Proficiente")
  assert.equal(proficiencyLabel(null), null)
  assert.equal(proficiencyLabel(0), null)
  assert.equal(proficiencyLabel(6), null)
})

test("weight labels 1..5 are the canonical PD-021 labels", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((n) => weightLabel(n)),
    ["Complementar", "Baixa", "Importante", "Alta", "Crítica"]
  )
  assert.equal(WEIGHT_LABELS[5], "Crítica")
  assert.equal(weightLabel(null), null)
  assert.equal(weightLabel(9), null)
})

test("type labels map the persisted domain to canonical labels", () => {
  assert.equal(competencyTypeLabel("core"), "Essencial")
  assert.equal(competencyTypeLabel("leadership"), "Liderança")
  assert.equal(competencyTypeLabel("promotion"), "Promoção")
  assert.equal(competencyTypeLabel("optional"), "Opcional")
  assert.equal(COMPETENCY_TYPE_LABELS.core, "Essencial")
  assert.equal(competencyTypeLabel(null), null)
  assert.equal(competencyTypeLabel("unknown"), null)
})

// --------------------------------------------------------------------------
// Presenter maps the RPC-resolved cells; it never recomputes inheritance.
// --------------------------------------------------------------------------
function cell(
  partial: Partial<PositionSeniorityCompetencyCell> &
    Pick<PositionSeniorityCompetencyCell, "source">
): PositionSeniorityCompetencyCell {
  return {
    positionSeniorityProfileId: "prof",
    seniorityLevelId: null,
    isBaseProfile: false,
    profileActive: true,
    competencyId: "comp",
    expectedLevel: null,
    weight: null,
    required: null,
    type: null,
    notes: null,
    inherited: false,
    baseRowId: null,
    overrideRowId: null,
    ...partial,
  }
}

test("source mapping: base / inherited / override / none -> state + labels", () => {
  const vm = presentPositionSeniorityCompetencyMatrix({
    cells: [
      cell({
        source: "base",
        isBaseProfile: true,
        seniorityLevelId: null,
        expectedLevel: 4,
        weight: 5,
        required: true,
        type: "core",
        baseRowId: "b1",
        competencyId: "A",
      }),
      cell({
        source: "base",
        isBaseProfile: false,
        seniorityLevelId: "s-sr",
        inherited: true,
        expectedLevel: 4,
        weight: 5,
        required: true,
        type: "core",
        baseRowId: "b1",
        competencyId: "A",
      }),
      cell({
        source: "override",
        isBaseProfile: false,
        seniorityLevelId: "s-sr",
        expectedLevel: 2,
        weight: 3,
        required: false,
        type: "optional",
        overrideRowId: "o1",
        competencyId: "B",
      }),
      cell({ source: "none", isBaseProfile: false, competencyId: "C" }),
    ],
  })

  const [base, inherited, override, none] = vm.cells

  assert.equal(base.state, "base")
  assert.equal(base.stateLabel, "Base")
  assert.equal(base.expectedLevelLabel, "Avançado")
  assert.equal(base.weightLabel, "Crítica")
  assert.equal(base.typeLabel, "Essencial")

  assert.equal(inherited.state, "inherited")
  assert.equal(inherited.stateLabel, "Herdado do Base")
  assert.equal(inherited.inherited, true)
  assert.equal(inherited.expectedLevel, 4) // carried from the RPC, not recomputed
  assert.equal(inherited.baseRowId, "b1")

  assert.equal(override.state, "override")
  assert.equal(override.stateLabel, "Personalizado")
  assert.equal(override.overrideRowId, "o1")
  assert.equal(override.typeLabel, "Opcional")
})

test("source=none retains null effective fields and fabricates no labels", () => {
  const vm = presentPositionSeniorityCompetencyMatrix({
    cells: [cell({ source: "none", competencyId: "C" })],
  })
  const [c] = vm.cells
  assert.equal(c.state, "none")
  assert.equal(c.stateLabel, "Não definido")
  assert.equal(c.expectedLevel, null)
  assert.equal(c.expectedLevelLabel, null)
  assert.equal(c.weight, null)
  assert.equal(c.weightLabel, null)
  assert.equal(c.type, null)
  assert.equal(c.typeLabel, null)
})

test("IDs and semantic fields are preserved through mapping", () => {
  const vm = presentPositionSeniorityCompetencyMatrix({
    cells: [
      cell({
        source: "override",
        positionSeniorityProfileId: "prof-42",
        seniorityLevelId: "s-9",
        competencyId: "comp-7",
        overrideRowId: "row-1",
        baseRowId: "row-0",
      }),
    ],
  })
  const [c] = vm.cells
  assert.equal(c.positionSeniorityProfileId, "prof-42")
  assert.equal(c.seniorityLevelId, "s-9")
  assert.equal(c.competencyId, "comp-7")
  assert.equal(c.overrideRowId, "row-1")
  assert.equal(c.baseRowId, "row-0")
})

// --------------------------------------------------------------------------
// Trusted-boundary wiring: reads go only through the 0122 RPC; no direct table
// access; no independent inheritance resolution; no mutation in this slice.
// --------------------------------------------------------------------------
test("repository reads only through the 0122 matrix RPC", () => {
  assert.match(
    repository,
    /get_tenant_position_seniority_competency_matrix_v1/
  )
  assert.match(repository, /p_include_archived_profiles/)
})

test("no direct protected SELECT / browser client / service_role in the read path", () => {
  for (const source of [repository, query, presenter]) {
    assert.doesNotMatch(source, /\.from\("position_seniority_competencies"\)/)
    assert.doesNotMatch(source, /\.from\("position_seniority_profiles"\)/)
    assert.doesNotMatch(source, /\.from\("seniority_levels"\)/)
    assert.doesNotMatch(source, /service_role|createBrowserClient/)
  }
})

test("no mutation RPCs are wired in this read-only slice", () => {
  for (const source of [repository, query, presenter]) {
    assert.doesNotMatch(source, /set_tenant_position_seniority_competency_v1/)
    assert.doesNotMatch(source, /clear_tenant_position_seniority_competency_v1/)
  }
})

test("effective resolution stays in the DB: no override??base recomputation app-side", () => {
  // The presenter classifies the RPC's `source`; it must not re-derive the
  // effective value by comparing override vs base rows itself.
  assert.doesNotMatch(presenter, /overrideRowId\s*\?\?|baseRowId\s*\?\?/)
  assert.doesNotMatch(presenter, /\?\?\s*base/i)
})

test("includeArchivedProfiles defaults to false and is passed through", () => {
  assert.match(query, /includeArchivedProfiles\s*=\s*false/)
  assert.match(query, /findMatrixByPosition\(\s*[\s\S]*includeArchivedProfiles/)
})
