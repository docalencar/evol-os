import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { presentPositionSeniorities } from "./presenters/present-position-seniorities"
import type { PositionSeniorityProfile } from "./types/position-seniority-profile"
import type { SeniorityCatalogEntry } from "./repositories/position-seniority-profile-repository"

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8")

const repository = read("./repositories/position-seniority-profile-repository.ts")
const addAction = read("./actions/add-position-seniority-action.ts")
const archiveAction = read("./actions/archive-position-seniority-action.ts")
const section = read("./components/position-seniorities-section.tsx")
const detailPage = read(
  "../../../app/(dashboard)/app/company/positions/[id]/page.tsx"
)
const positionTable = read("../positions/components/position-table.tsx")

test("reads go through the 0101/0102 boundaries, mutations through the 0102 boundaries", () => {
  assert.match(repository, /get_tenant_position_seniority_profiles_v1/)
  assert.match(repository, /get_tenant_seniority_levels_v1/)
  assert.match(repository, /add_tenant_position_seniority_profile_v1/)
  assert.match(repository, /archive_tenant_position_seniority_profile_v1/)
})

test("no direct protected DML/SELECT on the two tables in the app path", () => {
  for (const source of [repository, addAction, archiveAction]) {
    assert.doesNotMatch(source, /\.from\("seniority_levels"\)/)
    assert.doesNotMatch(source, /\.from\("position_seniority_profiles"\)/)
    assert.doesNotMatch(source, /service_role|createBrowserClient/)
  }
})

test("company context is server-derived; no idempotency token is invented for add", () => {
  assert.match(addAction, /getCurrentCompanyContext\(\)/)
  assert.match(archiveAction, /getCurrentCompanyContext\(\)/)
  // The add boundary is idempotent on its natural key — no submissionId/intentKey.
  assert.doesNotMatch(addAction, /submissionId|intentKey|newSubmissionId/)
})

test("no Activity is created app-side (0102 records it atomically)", () => {
  for (const source of [repository, addAction, archiveAction]) {
    assert.doesNotMatch(source, /activity_events|append.*[Aa]ctivity/)
  }
})

test("the presenter hides the base profile and only offers unused active seniorities", () => {
  const profiles: PositionSeniorityProfile[] = [
    { id: "base", positionId: "p", seniorityLevelId: null, active: true, createdAt: "", updatedAt: "" },
    { id: "prof-jr", positionId: "p", seniorityLevelId: "s-jr", active: true, createdAt: "", updatedAt: "" },
    { id: "prof-arch", positionId: "p", seniorityLevelId: "s-pl", active: false, createdAt: "", updatedAt: "" },
  ]
  const catalog: SeniorityCatalogEntry[] = [
    { id: "s-jr", code: "JR", label: "Júnior", rank: 10, active: true },
    { id: "s-pl", code: "PL", label: "Pleno", rank: 20, active: true },
    { id: "s-sr", code: "SR", label: "Sênior", rank: 30, active: true },
    { id: "s-old", code: "OLD", label: "Arquivada", rank: 5, active: false },
  ]

  const vm = presentPositionSeniorities({ profiles, catalog })

  // Base profile (null) is never surfaced as applicable.
  assert.deepEqual(vm.applicable.map((a) => a.seniorityLevelId), ["s-jr"])
  assert.equal(vm.applicable.length, 1)
  // Available = active catalog minus already-applied; archived catalog excluded.
  assert.deepEqual(vm.available.map((a) => a.id), ["s-pl", "s-sr"])
})

test("the section hides the base profile and never archives it; wording removes from the position, not the catalog", () => {
  // The section renders the presenter's applicable list (base already filtered).
  assert.match(section, /applicable\.map/)
  assert.match(section, /Este cargo não utiliza senioridade específica\./)
  // Remove wording makes the catalog-preservation explicit.
  assert.match(archiveAction, /removida do cargo/)
})

test("the detail page reads competencies through the trusted boundary, not the legacy direct read", () => {
  // The legacy getCompetencies (direct .from("competencies").select) is gone.
  assert.doesNotMatch(detailPage, /getCompetencies\b/)
  assert.doesNotMatch(detailPage, /from "@\/features\/competencies"/)
  // It uses the management read boundary instead.
  assert.match(detailPage, /getManagementCompetencies\(companyId\)/)
  // And no direct protected SELECT remains on the page.
  assert.doesNotMatch(detailPage, /\.from\("competencies"\)/)
})

test("the detail page still renders the seniorities section", () => {
  assert.match(detailPage, /getPositionSeniorities\(companyId, positionId\)/)
  assert.match(detailPage, /<PositionSenioritiesSection/)
})

test("the detail page has an explicit, deterministic back link to the positions list", () => {
  assert.match(detailPage, /Voltar para cargos/)
  assert.match(detailPage, /href="\/app\/company\/positions"/)
  // Deterministic destination — not history-dependent.
  assert.doesNotMatch(detailPage, /router\.back\(\)/)
})

test("the position list exposes an explicit 'Ver detalhes' link to the detail page", () => {
  assert.match(positionTable, /Ver detalhes/)
  assert.match(
    positionTable,
    /href=\{`\/app\/company\/positions\/\$\{position\.id\}`\}/
  )
})
