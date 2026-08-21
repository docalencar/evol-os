import type {
  ApplyOrganizationSyncPlanActionResult,
} from "@/features/organization/sync"

// Post-import activation view-model. Turns the trusted-execution result into a
// capability-oriented moment: it celebrates that the organization is already
// operational (Layer 1 — Company/Department/Position/Person), summarizes what
// was created, and points to the next high-value — but OPTIONAL — enrichment.
// This is pure presentation: no completeness percentage, no artificial blockers,
// no extra data source.

export type ImportActivationTone = "operational" | "partial" | "failed"

export type ImportActivationNextAction = {
  id: string
  label: string
  href: string
  emphasis: "primary" | "secondary" | "tertiary"
}

export type ImportActivationRecommendation = {
  title: string
  description: string
  ctaLabel: string
  href: string
}

export type ImportActivationCreatedSummary = {
  departments: number
  teams: number
  positions: number
  people: number
}

export type ImportActivationSummary = {
  tone: ImportActivationTone
  // True only when nothing failed — the org is safe to start using.
  operational: boolean
  // Operational AND nothing was created — a valid no-op / already-updated state.
  noChanges: boolean
  headline: string
  description: string
  createdSummary: ImportActivationCreatedSummary
  // Business-facing "Mudanças realizadas" lines, e.g. "1 departamento criado".
  // Non-zero entities only; empty when nothing was created.
  changes: string[]
  // Honest framing for the unchanged (pre-existing) entities the plan skipped.
  // Present only when something was already up to date. Never "Ignorados".
  alreadyUpToDateMessage: string | null
  nextActions: ImportActivationNextAction[]
  // Optional next-capability nudge, present only on a fully successful import.
  recommendation: ImportActivationRecommendation | null
}

// Routes are existing, verified app routes.
const ROUTE_PEOPLE = "/app/people"
const ROUTE_COMPANY = "/app/company"
const ROUTE_POSITIONS = "/app/company/positions"
const ROUTE_SYNC_HISTORY = "/app/company/sync-history"

function buildNextActions(): ImportActivationNextAction[] {
  return [
    {
      id: "people",
      label: "Ver pessoas",
      href: ROUTE_PEOPLE,
      emphasis: "primary",
    },
    {
      id: "structure",
      label: "Ver estrutura",
      href: ROUTE_COMPANY,
      emphasis: "secondary",
    },
    {
      id: "positions",
      label: "Ver cargos",
      href: ROUTE_POSITIONS,
      emphasis: "secondary",
    },
    {
      id: "sync-history",
      label: "Ver histórico da sincronização",
      href: ROUTE_SYNC_HISTORY,
      emphasis: "tertiary",
    },
  ]
}

// Optional enrichment recommendation. Position competencies are the highest-value
// unlock: role adherence and the Talent Card only become available once a
// person's position has expected competencies (features/talent competency-gap +
// talent-card). Framed as optional value, and "start with the most important
// positions" — never as required setup, never an impact-ranking engine.
function buildRecommendation(): ImportActivationRecommendation {
  return {
    title: "Próximo passo recomendado",
    description:
      "Comece definindo as competências dos cargos mais importantes da sua empresa. Isso permitirá ao Evol identificar aderência ao cargo, pontos fortes e oportunidades de desenvolvimento. Você não precisa configurar tudo agora. Comece pelos cargos mais importantes.",
    ctaLabel: "Configurar cargos",
    href: ROUTE_POSITIONS,
  }
}

// Build the "Mudanças realizadas" lines from the per-entity applied counts.
// Non-zero only, singular/plural PT-BR. "Pessoa criada" is feminine.
function buildChanges(
  created: ImportActivationCreatedSummary
): string[] {
  const lines: string[] = []

  const add = (
    count: number,
    singular: string,
    plural: string
  ) => {
    if (count > 0) {
      lines.push(`${count} ${count === 1 ? singular : plural}`)
    }
  }

  add(created.departments, "departamento criado", "departamentos criados")
  add(created.teams, "time criado", "times criados")
  add(created.positions, "cargo criado", "cargos criados")
  // Evol adds a collaborator to the organization (not "creates a person").
  add(created.people, "colaborador adicionado", "colaboradores adicionados")

  return lines
}

export function presentImportActivationSummary(
  result: ApplyOrganizationSyncPlanActionResult
): ImportActivationSummary {
  const createdSummary: ImportActivationCreatedSummary = {
    departments: result.appliedByEntity.department,
    teams: result.appliedByEntity.team,
    positions: result.appliedByEntity.position,
    people: result.appliedByEntity.employee,
  }

  const changes = buildChanges(createdSummary)

  // The plan's "skipped" items are entities that already existed and needed no
  // change — NEVER spreadsheet rows that were ignored.
  const alreadyUpToDateMessage =
    result.skippedItems > 0
      ? "Algumas estruturas já estavam atualizadas e não precisaram de alteração."
      : null

  // A single source of truth for state: reuse the existing result contract.
  // success (failedItems === 0) => operational; otherwise honest partial/failure.
  const operational = result.success
  const appliedSomething = result.appliedItems > 0

  if (!operational) {
    const tone: ImportActivationTone = appliedSomething
      ? "partial"
      : "failed"

    return {
      tone,
      operational: false,
      noChanges: false,
      headline: appliedSomething
        ? "Importação aplicada parcialmente"
        : "Não foi possível concluir a importação",
      description: appliedSomething
        ? "Parte da planilha foi aplicada. Revise os itens com erro abaixo e sincronize novamente para concluir os que faltaram."
        : "Nenhum item foi aplicado. Revise os erros abaixo e tente sincronizar novamente.",
      createdSummary,
      // On a partial result, still show what was successfully created; on a full
      // failure there is nothing to show.
      changes: appliedSomething ? changes : [],
      alreadyUpToDateMessage,
      // On a non-clean result, guide only to what already exists; do not nudge
      // optional enrichment amid errors.
      nextActions: appliedSomething ? buildNextActions() : [],
      recommendation: null,
    }
  }

  // Operational success. Distinguish "created new structure" from a no-op sync
  // (e.g. idempotent retry / everything already present) — both are valid and
  // usable; neither implies "incomplete".
  const noChanges = !appliedSomething

  const headline = appliedSomething
    ? "Sua organização está pronta para começar."
    : "Nenhuma alteração necessária."

  const description = appliedSomething
    ? "A estrutura importada já está disponível no Evol e pode ser usada agora. Veja as alterações realizadas e escolha como deseja continuar."
    : "Sua organização já estava atualizada com as informações desta importação."

  return {
    tone: "operational",
    operational: true,
    noChanges,
    headline,
    description,
    createdSummary,
    changes,
    alreadyUpToDateMessage,
    nextActions: buildNextActions(),
    recommendation: buildRecommendation(),
  }
}
