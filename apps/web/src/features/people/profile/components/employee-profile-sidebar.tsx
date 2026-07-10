import { DashboardCard, KeyValueList } from "@/components/dashboard"

type EmployeeProfileSidebarProps = {
  positionName: string
  teamName: string
  managerName?: string
  status: string
  hireDate: string
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(date))
}

export function EmployeeProfileSidebar({
  positionName,
  teamName,
  managerName,
  status,
  hireDate,
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
            value: positionName,
          },
          {
            label: "Time",
            value: teamName,
          },
          {
            label: "Gestor",
            value: managerName || "-",
          },
          {
            label: "Status",
            value: status,
          },
          {
            label: "Admissão",
            value: formatDate(hireDate),
          },
        ]}
      />
    </DashboardCard>
  )
}
