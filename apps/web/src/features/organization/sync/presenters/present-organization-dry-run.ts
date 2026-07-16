import type {
  OrganizationDryRunDecision,
  OrganizationDryRunReport,
} from "../types/organization-dry-run-report"
import type {
  OrganizationEntity,
} from "../types/organization-entity"
import type {
  OrganizationSyncOperation,
} from "../types/organization-sync-operation"
import type {
  OrganizationDryRunDecisionTone,
  OrganizationDryRunNoticeViewModel,
  OrganizationDryRunSummaryViewModel,
  OrganizationDryRunViewModel,
} from "../view-models/organization-dry-run-view-model"

const ENTITY_LABELS: Record<
  OrganizationEntity,
  string
> = {
  department: "Departamentos",
  team: "Times",
  position: "Cargos",
  employee: "Colaboradores",
}

const OPERATION_LABELS: Record<
  OrganizationSyncOperation,
  string
> = {
  create: "Criações",
  update: "Atualizações",
  move: "Movimentações",
  archive: "Arquivamentos",
  restore: "Restaurações",
  unchanged: "Sem alterações",
  conflict: "Conflitos",
}

function presentDecision(
  decision: OrganizationDryRunDecision
): OrganizationDryRunViewModel["decision"] {
  const decisions: Record<
    OrganizationDryRunDecision,
    {
      tone: OrganizationDryRunDecisionTone
      title: string
      description: string
    }
  > = {
    safe: {
      tone: "success",
      title: "Sincronização segura",
      description:
        "Nenhum conflito ou aviso foi encontrado. O plano pode ser aplicado.",
    },
    review: {
      tone: "warning",
      title: "Revisão recomendada",
      description:
        "O plano pode ser aplicado, mas existem avisos que devem ser revisados.",
    },
    blocked: {
      tone: "danger",
      title: "Sincronização bloqueada",
      description:
        "Existem conflitos que precisam ser resolvidos antes da aplicação.",
    },
  }

  return {
    status: decision,
    ...decisions[decision],
  }
}

function presentEntitySummary(
  report: OrganizationDryRunReport
): OrganizationDryRunSummaryViewModel[] {
  return (
    Object.entries(report.entitySummary) as Array<
      [
        OrganizationEntity,
        OrganizationDryRunReport["entitySummary"][OrganizationEntity],
      ]
    >
  ).map(([entity, summary]) => ({
    key: entity,
    label: ENTITY_LABELS[entity],
    ...summary,
  }))
}

function presentOperationSummary(
  report: OrganizationDryRunReport
): OrganizationDryRunSummaryViewModel[] {
  return (
    Object.entries(report.operationSummary) as Array<
      [
        OrganizationSyncOperation,
        OrganizationDryRunReport["operationSummary"][OrganizationSyncOperation],
      ]
    >
  ).map(([operation, summary]) => ({
    key: operation,
    label: OPERATION_LABELS[operation],
    ...summary,
  }))
}

function presentNotices(
  notices: OrganizationDryRunReport["warnings"]
): OrganizationDryRunNoticeViewModel[] {
  return notices.map((notice) => ({
    itemId: notice.itemId,
    title: notice.title,
    description: notice.message,
    entityLabel: ENTITY_LABELS[notice.entity],
    operationLabel:
      OPERATION_LABELS[notice.operation],
  }))
}

export function presentOrganizationDryRun(
  report: OrganizationDryRunReport
): OrganizationDryRunViewModel {
  return {
    decision: presentDecision(report.decision),

    metrics: [
      {
        key: "total",
        label: "Itens analisados",
        value: report.totalItems,
      },
      {
        key: "applicable",
        label: "Aplicáveis",
        value: report.applicableItems,
      },
      {
        key: "skipped",
        label: "Sem alteração",
        value: report.skippedItems,
      },
      {
        key: "blocked",
        label: "Bloqueados",
        value: report.blockedItems,
      },
    ],

    entitySummary: presentEntitySummary(report),

    operationSummary:
      presentOperationSummary(report),

    warnings: presentNotices(report.warnings),

    blockers: presentNotices(report.blockers),

    generatedAtLabel:
      new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Fortaleza",
      }).format(report.generatedAt),
  }
}
