import Link from "next/link"

import {
  DashboardCard,
  KeyValueList,
} from "@/components/dashboard"
import { Button } from "@/components/ui/button"

import type {
  EmployeeWorkspaceOrganizationViewModel,
} from "../view-models/employee-workspace-view-model"

type EmployeeProfileSidebarProps = {
  organization: EmployeeWorkspaceOrganizationViewModel
  personId: string
}

export function EmployeeProfileSidebar({
  organization,
  personId,
}: EmployeeProfileSidebarProps) {
  // Carry the origin as a narrow, typed context (the person id only) so Team
  // management can offer a "Voltar para o perfil" back link. The Teams page
  // re-validates this as a UUID, so it can only ever resolve to an internal
  // /app/people/<id> route — never an open/arbitrary redirect.
  const manageTeamsHref = `/app/company/teams?fromPersonId=${encodeURIComponent(personId)}`

  return (
    <DashboardCard
      title="Organização"
      description="Dados organizacionais"
      actions={
        // Optional bridge to the existing Team management screen. Teams are an
        // optional organizational structure — this is a "you can organize
        // further if useful" navigation, never a requirement.
        <Link href={manageTeamsHref}>
          <Button variant="secondary">
            Gerenciar times
          </Button>
        </Link>
      }
    >
      <KeyValueList
        items={[
          {
            label: "Departamento",
            value:
              organization.departmentLabel,
          },
          {
            label: "Cargo",
            value:
              organization.positionLabel,
          },
          {
            label: "Senioridade",
            value:
              organization.seniorityLabel,
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
