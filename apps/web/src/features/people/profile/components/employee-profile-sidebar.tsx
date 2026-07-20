import {
  DashboardCard,
  KeyValueList,
} from "@/components/dashboard"

import type {
  EmployeeWorkspaceOrganizationViewModel,
} from "../view-models/employee-workspace-view-model"

type EmployeeProfileSidebarProps = {
  organization: EmployeeWorkspaceOrganizationViewModel
}

export function EmployeeProfileSidebar({
  organization,
}: EmployeeProfileSidebarProps) {
  return (
    <DashboardCard
      title="Organização"
      description="Dados organizacionais"
    >
      <KeyValueList
        items={[
          {
            label: "Cargo",
            value:
              organization.positionLabel,
          },
          {
            label: "Time",
            value:
              organization.teamLabel,
          },
          {
            label: "Gestor",
            value:
              organization.managerLabel,
          },
          {
            label: "Status",
            value:
              organization.statusLabel,
          },
          {
            label: "Admissão",
            value:
              organization.hireDateLabel,
          },
        ]}
      />
    </DashboardCard>
  )
}
