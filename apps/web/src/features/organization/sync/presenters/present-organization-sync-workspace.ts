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
    metrics,
  }
}
