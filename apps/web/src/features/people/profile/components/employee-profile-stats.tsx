import {
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Users,
} from "lucide-react"

import { StatCard } from "@/components/dashboard"

type EmployeeProfileStatsProps = {
  hireDate?: string | null
  teamName: string
  positionName: string
}

function getYearsInCompany(date?: string | null) {
  if (!date) return "-"

  const hireDate = new Date(date)
  const today = new Date()

  let years = today.getFullYear() - hireDate.getFullYear()

  const monthDiff = today.getMonth() - hireDate.getMonth()

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < hireDate.getDate())
  ) {
    years--
  }

  return years <= 0 ? "< 1 ano" : `${years} ano${years > 1 ? "s" : ""}`
}

function formatDate(date?: string | null) {
  if (!date) return "-"

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(date))
}

export function EmployeeProfileStats({
  hireDate,
  teamName,
  positionName,
}: EmployeeProfileStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Tempo de empresa"
        value={getYearsInCompany(hireDate)}
        description="Vínculo"
        icon={<Building2 size={20} />}
      />

      <StatCard
        label="Cargo"
        value={positionName}
        description="Função atual"
        icon={<BriefcaseBusiness size={20} />}
      />

      <StatCard
        label="Time"
        value={teamName}
        description="Equipe"
        icon={<Users size={20} />}
      />

      <StatCard
        label="Admissão"
        value={formatDate(hireDate)}
        description="Data"
        icon={<CalendarDays size={20} />}
      />
    </div>
  )
}
