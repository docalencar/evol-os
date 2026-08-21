import type {
  OrganizationSyncItem,
} from "../types/organization-sync-item"
import type {
  OrganizationSyncPlan,
} from "../types/organization-sync-plan"
import type {
  OrganizationSyncMetricViewModel,
  OrganizationSyncWorkspaceViewModel,
} from "../view-models/organization-sync-workspace-view-model"

function formatGeneratedAt(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(value)
}

// Future-tense, per-entity "what will be applied" phrasing. Collaborators are
// "adicionados"; structures are "criados/criadas". Non-zero entities only, in a
// stable organizational order. Derived from the create items in the plan — the
// same plan; no recalculation of counts.
const PLANNED_CHANGE_ORDER: {
  entity: OrganizationSyncItem["entity"]
  singular: string
  plural: string
}[] = [
  {
    entity: "department",
    singular: "1 departamento será criado",
    plural: "departamentos serão criados",
  },
  {
    entity: "team",
    singular: "1 time será criado",
    plural: "times serão criados",
  },
  {
    entity: "position",
    singular: "1 cargo será criado",
    plural: "cargos serão criados",
  },
  {
    entity: "employee",
    singular: "1 colaborador será adicionado",
    plural: "colaboradores serão adicionados",
  },
]

function buildPlannedChanges(
  plan: OrganizationSyncPlan
): string[] {
  return PLANNED_CHANGE_ORDER.flatMap(
    ({ entity, singular, plural }) => {
      const count = plan.items.filter(
        (item) =>
          item.entity === entity &&
          item.operation === "create"
      ).length

      if (count === 0) {
        return []
      }

      return [count === 1 ? singular : `${count} ${plural}`]
    }
  )
}

export function presentOrganizationSyncWorkspace(
  plan: OrganizationSyncPlan
): OrganizationSyncWorkspaceViewModel {
  const totalChanges =
    plan.summary.creates +
    plan.summary.updates +
    plan.summary.moves +
    plan.summary.archives +
    plan.summary.restores

  const metrics: OrganizationSyncMetricViewModel[] = [
    {
      id: "creates",
      label: "Novos registros",
      value: plan.summary.creates,
      description: "Entidades que serão criadas.",
      tone: "positive",
    },
    {
      id: "updates",
      label: "Atualizações",
      value: plan.summary.updates,
      description: "Dados existentes que serão atualizados.",
      tone: "warning",
    },
    {
      id: "moves",
      label: "Movimentações",
      value: plan.summary.moves,
      description: "Mudanças de estrutura ou vínculo.",
      tone: "warning",
    },
    {
      id: "archives",
      label: "Ausentes na origem",
      value: plan.summary.archives,
      description: "Registros que exigem revisão humana.",
      tone: plan.summary.archives > 0 ? "critical" : "neutral",
    },
    {
      id: "unchanged",
      label: "Sem alteração",
      value: plan.summary.unchanged,
      description: "Registros já sincronizados.",
      tone: "neutral",
    },
    {
      id: "conflicts",
      label: "Conflitos",
      value: plan.summary.conflicts,
      description: "Casos que precisam de decisão.",
      tone: plan.summary.conflicts > 0 ? "critical" : "neutral",
    },
  ]

  const requiresReview =
    plan.summary.archives > 0 ||
    plan.summary.conflicts > 0

  return {
    generatedAtLabel: formatGeneratedAt(plan.generatedAt),
    totalChanges,
    requiresReview,
    canApply:
      totalChanges > 0 &&
      plan.summary.conflicts === 0,
    noChange:
      plan.items.length > 0 &&
      totalChanges === 0 &&
      plan.summary.conflicts === 0,
    plannedChanges: buildPlannedChanges(plan),
    alreadyRecognizedMessage:
      plan.summary.unchanged > 0
        ? "Algumas estruturas já existentes foram reconhecidas e não precisam de alteração."
        : null,
    metrics,
  }
}
