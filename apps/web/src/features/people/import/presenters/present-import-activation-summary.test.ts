import assert from "node:assert/strict"
import test from "node:test"

import type {
  ApplyOrganizationSyncPlanActionResult,
} from "@/features/organization/sync"

import {
  presentImportActivationSummary,
} from "./present-import-activation-summary"

function makeResult(
  overrides: Partial<ApplyOrganizationSyncPlanActionResult> = {}
): ApplyOrganizationSyncPlanActionResult {
  return {
    success: true,
    message: "3 itens aplicados com sucesso.",
    totalItems: 4,
    appliedItems: 3,
    skippedItems: 1,
    failedItems: 0,
    appliedByEntity: {
      department: 1,
      team: 0,
      position: 1,
      employee: 1,
    },
    errors: [],
    ...overrides,
  }
}

const hrefs = (
  summary: ReturnType<typeof presentImportActivationSummary>
) => summary.nextActions.map((action) => action.href)

test("1. a successful import communicates operational readiness", () => {
  const summary = presentImportActivationSummary(makeResult())
  assert.equal(summary.operational, true)
  assert.equal(summary.tone, "operational")
  assert.match(summary.headline, /pronta para começar/i)
})

test("2. it never uses percentage-completion / 'incomplete' framing", () => {
  const summary = presentImportActivationSummary(makeResult())
  const blob = JSON.stringify(summary)
  assert.doesNotMatch(blob, /%|\bcompleto\b|incompleto|configuração incompleta/i)
  assert.doesNotMatch(blob, /você ainda precisa/i)
})

test("3-5. guided next actions cover People, Company structure, Positions", () => {
  const summary = presentImportActivationSummary(makeResult())
  const routes = hrefs(summary)
  assert.ok(routes.includes("/app/people"), "people")
  assert.ok(routes.includes("/app/company"), "structure")
  assert.ok(routes.includes("/app/company/positions"), "positions")
  // Exactly one primary action (People); the rest are secondary/tertiary.
  const primaries = summary.nextActions.filter(
    (a) => a.emphasis === "primary"
  )
  assert.equal(primaries.length, 1)
  assert.equal(primaries[0]?.href, "/app/people")
})

test("5b. sync-history navigation remains available", () => {
  const summary = presentImportActivationSummary(makeResult())
  assert.ok(hrefs(summary).includes("/app/company/sync-history"))
})

test("6. the optional recommendation explains the capability benefit", () => {
  const summary = presentImportActivationSummary(makeResult())
  assert.ok(summary.recommendation)
  const rec = summary.recommendation!
  assert.equal(rec.title, "Próximo passo recomendado")
  // Competencies -> adherence + strengths + development opportunities.
  assert.match(rec.description, /compet[êe]ncias/i)
  assert.match(rec.description, /ader[êe]ncia/i)
  assert.match(rec.description, /pontos fortes/i)
  assert.match(rec.description, /desenvolvimento/i)
  // CTA points to the real positions route.
  assert.equal(rec.ctaLabel, "Configurar cargos")
  assert.equal(rec.href, "/app/company/positions")
})

test("7. the recommendation is optional, not a blocker/mandate", () => {
  const rec = presentImportActivationSummary(makeResult()).recommendation!
  // Progressive framing: not everything now; start with the most important roles.
  assert.match(rec.description, /não precisa configurar tudo agora/i)
  assert.match(rec.description, /mais importantes/i)
  // No mandate / completeness / percentage language anywhere in the card.
  assert.doesNotMatch(rec.description, /configuração incompleta/i)
  assert.doesNotMatch(rec.description, /complete sua configuração/i)
  assert.doesNotMatch(rec.description, /ainda não está pronta/i)
  assert.doesNotMatch(rec.description, /%/)
})

test("8a. a partial result does not claim full operational success", () => {
  const summary = presentImportActivationSummary(
    makeResult({
      success: false,
      failedItems: 1,
      appliedItems: 2,
      errors: [
        {
          itemId: "x",
          entity: "position",
          operation: "create",
          message: "Não foi possível aplicar este item.",
        },
      ],
    })
  )
  assert.equal(summary.operational, false)
  assert.equal(summary.tone, "partial")
  assert.doesNotMatch(summary.headline, /pronta para começar/i)
  // No enrichment nudge amid errors.
  assert.equal(summary.recommendation, null)
  // Still guides to what already exists.
  assert.ok(summary.nextActions.length > 0)
})

test("8b. a total failure is honest and offers no false success/next steps", () => {
  const summary = presentImportActivationSummary(
    makeResult({
      success: false,
      failedItems: 3,
      appliedItems: 0,
      skippedItems: 0,
      appliedByEntity: {
        department: 0,
        team: 0,
        position: 0,
        employee: 0,
      },
    })
  )
  assert.equal(summary.operational, false)
  assert.equal(summary.tone, "failed")
  assert.doesNotMatch(summary.headline, /pronta para começar/i)
  assert.equal(summary.recommendation, null)
  assert.equal(summary.nextActions.length, 0)
})

test("9. created-entity summary is preserved from appliedByEntity", () => {
  const summary = presentImportActivationSummary(makeResult())
  assert.deepEqual(summary.createdSummary, {
    departments: 1,
    teams: 0,
    positions: 1,
    people: 1,
  })
})

test("B1. business changes list uses singular PT-BR and omits zero entities", () => {
  const summary = presentImportActivationSummary(makeResult())
  assert.deepEqual(summary.changes, [
    "1 departamento criado",
    "1 cargo criado",
    "1 colaborador adicionado",
  ])
  // Team was zero — not listed.
  assert.ok(!summary.changes.some((c) => /time/.test(c)))
  // Collaborator terminology, never "pessoa criada".
  assert.doesNotMatch(JSON.stringify(summary.changes), /pessoa/i)
})

test("B2. business changes list uses correct plural PT-BR", () => {
  const summary = presentImportActivationSummary(
    makeResult({
      appliedItems: 8,
      appliedByEntity: {
        department: 2,
        team: 3,
        position: 2,
        employee: 4,
      },
    })
  )
  assert.deepEqual(summary.changes, [
    "2 departamentos criados",
    "3 times criados",
    "2 cargos criados",
    "4 colaboradores adicionados",
  ])
})

test("B3. skipped items are framed as 'já estavam atualizadas', never 'Ignorados'", () => {
  const summary = presentImportActivationSummary(
    makeResult({ skippedItems: 4 })
  )
  assert.match(summary.alreadyUpToDateMessage ?? "", /já estavam atualizadas/i)
  assert.doesNotMatch(JSON.stringify(summary), /ignorad/i)
})

test("B4. no skipped items => no already-up-to-date message", () => {
  const summary = presentImportActivationSummary(
    makeResult({ skippedItems: 0 })
  )
  assert.equal(summary.alreadyUpToDateMessage, null)
})

test("C. a clean no-change success is honest and still operational", () => {
  const summary = presentImportActivationSummary(
    makeResult({
      appliedItems: 0,
      skippedItems: 4,
      appliedByEntity: {
        department: 0,
        team: 0,
        position: 0,
        employee: 0,
      },
    })
  )
  assert.equal(summary.operational, true)
  assert.equal(summary.noChanges, true)
  assert.match(summary.headline, /nenhuma alteração necessária/i)
  assert.match(summary.description, /já estava atualizada/i)
  assert.doesNotMatch(summary.headline, /erro|falh/i)
  // Still a valid, usable state: navigation offered, no error framing.
  assert.ok(summary.nextActions.length > 0)
  assert.deepEqual(summary.changes, [])
})

test("D. a partial result still lists the successful changes", () => {
  const summary = presentImportActivationSummary(
    makeResult({
      success: false,
      failedItems: 1,
      appliedItems: 2,
      appliedByEntity: {
        department: 1,
        team: 0,
        position: 1,
        employee: 0,
      },
    })
  )
  assert.equal(summary.tone, "partial")
  assert.deepEqual(summary.changes, [
    "1 departamento criado",
    "1 cargo criado",
  ])
})
