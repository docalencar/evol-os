import { InfoCard } from "@/components/dashboard"

import type {
  PositionEmploymentType,
  PositionHierarchicalLevel,
  PositionStatus,
  PositionTravelRequirement,
  PositionWorkModel,
} from "../types/position"
import {
  employmentTypeOptions,
  hierarchicalLevelOptions,
  statusOptions,
  travelRequirementOptions,
  workModelOptions,
} from "./position-form/position-form-options"

type PositionOverviewCardProps = {
  departmentName: string | null
  hierarchicalLevel: PositionHierarchicalLevel
  status: PositionStatus
  weeklyWorkloadHours: number
  workModel: PositionWorkModel
  employmentType: PositionEmploymentType
  travelRequirement: PositionTravelRequirement
  competencyCount: number
  employeeCount: number
  activeEmployees: number
  onLeaveEmployees: number
}

function getOptionLabel<TValue extends string>(
  options: Array<{
    value: TValue
    label: string
  }>,
  value: TValue
) {
  return (
    options.find((option) => option.value === value)?.label ??
    "Não informado"
  )
}

export function PositionOverviewCard({
  departmentName,
  hierarchicalLevel,
  status,
  weeklyWorkloadHours,
  workModel,
  employmentType,
  travelRequirement,
  competencyCount,
  employeeCount,
  activeEmployees,
  onLeaveEmployees,
}: PositionOverviewCardProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="Departamento responsável"
          value={departmentName ?? "Não informado"}
        />

        <InfoCard
          label="Nível hierárquico"
          value={getOptionLabel(
            hierarchicalLevelOptions,
            hierarchicalLevel
          )}
        />

        <InfoCard
          label="Status"
          value={getOptionLabel(statusOptions, status)}
        />

        <InfoCard
          label="Jornada semanal"
          value={`${weeklyWorkloadHours} horas`}
        />

        <InfoCard
          label="Modalidade de trabalho"
          value={getOptionLabel(workModelOptions, workModel)}
        />

        <InfoCard
          label="Regime contratual"
          value={getOptionLabel(
            employmentTypeOptions,
            employmentType
          )}
        />

        <InfoCard
          label="Exigência de viagens"
          value={getOptionLabel(
            travelRequirementOptions,
            travelRequirement
          )}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label="Competências esperadas"
          value={competencyCount}
        />

        <InfoCard
          label="Colaboradores vinculados"
          value={employeeCount}
        />

        <InfoCard
          label="Colaboradores ativos"
          value={activeEmployees}
        />

        <InfoCard
          label="Em afastamento"
          value={onLeaveEmployees}
        />
      </div>
    </div>
  )
}