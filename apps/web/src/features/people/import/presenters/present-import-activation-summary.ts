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
  positions: number
  people: number
}

export type ImportActivationSummary = {
  tone: ImportActivationTone
  // True only when nothing failed — the org is safe to start using.
  operational: boolean
  headline: string
  description: string
  createdSummary: ImportActivationCreatedSummary
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

export function presentImportActivationSummary(
  result: ApplyOrganizationSyncPlanActionResult
): ImportActivationSummary {
  const createdSummary: ImportActivationCreatedSummary = {
    departments: result.appliedByEntity.department,
    positions: result.appliedByEntity.position,
    people: result.appliedByEntity.employee,
  }

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
      headline: appliedSomething
        ? "Importação aplicada parcialmente"
        : "Não foi possível concluir a importação",
      description: appliedSomething
        ? "Parte da planilha foi aplicada. Revise os itens com erro abaixo e sincronize novamente para concluir os que faltaram."
        : "Nenhum item foi aplicado. Revise os erros abaixo e tente sincronizar novamente.",
      createdSummary,
      // On a non-clean result, guide only to what already exists; do not nudge
      // optional enrichment amid errors.
      nextActions: appliedSomething ? buildNextActions() : [],
      recommendation: null,
    }
  }

  // Operational success. Distinguish "created new structure" from a no-op sync
  // (e.g. idempotent retry / everything already present) — both are valid and
  // usable; neither implies "incomplete".
  const headline = "Sua organização está pronta para começar."

  const description = appliedSomething
    ? "A estrutura importada já está disponível no Evol e pode ser usada agora. Veja o que foi criado e continue de onde quiser."
    : "Sua organização já estava sincronizada — nada novo foi necessário. Tudo continua pronto para uso."

  return {
    tone: "operational",
    operational: true,
    headline,
    description,
    createdSummary,
    nextActions: buildNextActions(),
    recommendation: buildRecommendation(),
  }
}
