import "server-only"

import {
  DashboardSection,
} from "@/components/dashboard/dashboard-section"

import {
  getOrganizationSyncHistory,
} from "../queries/get-organization-sync-history"

import {
  OrganizationSyncHistoryTable,
} from "./organization-sync-history-table"

type OrganizationSyncHistoryHomeProps = {
  companyId: string
}

export async function OrganizationSyncHistoryHome({
  companyId,
}: OrganizationSyncHistoryHomeProps) {
  const history =
    await getOrganizationSyncHistory(
      companyId
    )

  return (
    <DashboardSection
      title="Histórico de sincronizações"
      description={
        history.totalExecutions === 0
          ? "As sincronizações concluídas aparecerão aqui."
          : `${history.totalExecutions} execução${
              history.totalExecutions === 1
                ? ""
                : "ões"
            } registrada${
              history.totalExecutions === 1
                ? ""
                : "s"
            }.`
      }
    >
      <OrganizationSyncHistoryTable
        items={history.items}
      />
    </DashboardSection>
  )
}
