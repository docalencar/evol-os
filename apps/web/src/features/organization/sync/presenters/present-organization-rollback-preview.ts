import type {
  OrganizationEntity,
} from "../types/organization-entity"
import type {
  OrganizationRollbackOperation,
  OrganizationRollbackPlan,
} from "../types/organization-rollback-plan"
import type {
  OrganizationSyncOperation,
} from "../types/organization-sync-operation"
import type {
  OrganizationRollbackPreviewStatus,
  OrganizationRollbackPreviewViewModel,
} from "../view-models/organization-rollback-preview-view-model"

const ENTITY_LABELS: Record<
  OrganizationEntity,
  string
> = {
  department: "Departamento",
  team: "Time",
  position: "Cargo",
  employee: "Colaborador",
}

const SOURCE_OPERATION_LABELS: Record<
  OrganizationSyncOperation,
  string
> = {
  create: "Criação",
  update: "Atualização",
  move: "Movimentação",
  archive: "Arquivamento",
  restore: "Restauração",
  unchanged: "Sem alteração",
  conflict: "Conflito",
}

const ROLLBACK_OPERATION_LABELS: Record<
  OrganizationRollbackOperation,
  string
> = {
  archive: "Arquivar",
  restore: "Restaurar",
  update: "Restaurar dados",
  move: "Reverter movimentação",
}

function getStatus(
  plan: OrganizationRollbackPlan
): OrganizationRollbackPreviewStatus {
  if (plan.canRollback) {
    return "available"
  }

  if (
    plan.readyItems > 0 &&
    plan.unsupportedItems > 0
  ) {
    return "partial"
  }

  return "unavailable"
}

function presentDecision(
  status: OrganizationRollbackPreviewStatus
): Pick<
  OrganizationRollbackPreviewViewModel,
  "tone" | "title" | "description"
> {
  switch (status) {
    case "available":
      return {
        tone: "success",
        title: "Rollback disponível",
        description:
          "Todas as mutações desta execução possuem uma operação inversa pronta para revisão.",
      }

    case "partial":
      return {
        tone: "warning",
        title: "Rollback parcialmente disponível",
        description:
          "Parte das mutações pode ser revertida, mas existem operações que ainda não possuem metadados suficientes.",
      }

    case "unavailable":
      return {
        tone: "danger",
        title: "Rollback indisponível",
        description:
          "Esta execução não possui mutações reversíveis ou contém somente operações ainda não suportadas.",
      }
  }
}

export function presentOrganizationRollbackPreview(
  plan: OrganizationRollbackPlan
): OrganizationRollbackPreviewViewModel {
  const status = getStatus(plan)
  const decision = presentDecision(status)

  return {
    status,
    ...decision,
    canRollback: plan.canRollback,

    generatedAtLabel:
      new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Fortaleza",
      }).format(plan.generatedAt),

    metrics: [
      {
        key: "total",
        label: "Mutações analisadas",
        value: plan.totalItems,
        description:
          "Total de recibos encontrados na execução.",
      },
      {
        key: "ready",
        label: "Prontas para reverter",
        value: plan.readyItems,
        description:
          "Mutações com operação inversa disponível.",
      },
      {
        key: "unsupported",
        label: "Não suportadas",
        value: plan.unsupportedItems,
        description:
          "Mutações que exigem mais dados para reversão.",
      },
    ],

    items: plan.items.map((item) => ({
      key: `${item.receiptItemId}-${item.entityId}`,
      entityId: item.entityId,
      entityLabel:
        ENTITY_LABELS[item.entity],
      sourceOperationLabel:
        SOURCE_OPERATION_LABELS[
          item.sourceOperation
        ],
      rollbackOperationLabel:
        item.rollbackOperation
          ? ROLLBACK_OPERATION_LABELS[
              item.rollbackOperation
            ]
          : "Não disponível",
      status: item.status,
      statusLabel:
        item.status === "ready"
          ? "Pronto"
          : "Não suportado",
      message: item.message,
    })),
  }
}
