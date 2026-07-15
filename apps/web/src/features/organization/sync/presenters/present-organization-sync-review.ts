import type {
  OrganizationSyncPlan,
} from "../types/organization-sync-plan"
import type {
  OrganizationSyncItem,
} from "../types/organization-sync-item"
import type {
  OrganizationSyncReviewGroupViewModel,
  OrganizationSyncReviewViewModel,
} from "../view-models/organization-sync-review-view-model"

const ENTITY_LABELS: Record<
  OrganizationSyncItem["entity"],
  string
> = {
  department: "Departamentos",
  team: "Times",
  position: "Cargos",
  employee: "Colaboradores",
}

const OPERATION_LABELS: Record<
  OrganizationSyncItem["operation"],
  string
> = {
  create: "Criar",
  update: "Atualizar",
  move: "Movimentar",
  archive: "Revisar ausência",
  restore: "Restaurar",
  unchanged: "Sem alteração",
  conflict: "Conflito",
}

const GROUP_ORDER: OrganizationSyncItem["entity"][] = [
  "department",
  "team",
  "position",
  "employee",
]

export function presentOrganizationSyncReview(
  plan: OrganizationSyncPlan
): OrganizationSyncReviewViewModel {
  const groups = GROUP_ORDER.map<
    OrganizationSyncReviewGroupViewModel
  >((entity) => {
    const items = plan.items
      .filter((item) => item.entity === entity)
      .map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        operationLabel: OPERATION_LABELS[item.operation],
        severity: item.severity,
      }))

    return {
      id: entity,
      title: ENTITY_LABELS[entity],
      itemCount: items.length,
      items,
    }
  }).filter((group) => group.itemCount > 0)

  return {
    totalItems: plan.items.length,
    reviewItems: plan.items.filter(
      (item) => item.operation !== "unchanged"
    ).length,
    unchangedItems: plan.summary.unchanged,
    groups,
  }
}
