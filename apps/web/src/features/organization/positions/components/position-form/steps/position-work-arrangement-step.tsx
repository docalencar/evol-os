import { ProductWizardSummary } from "@/components/product"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  employmentTypeOptions,
  positionSelectClassName,
  travelRequirementOptions,
  workModelOptions,
} from "../position-form-options"
import type {
  PositionEmploymentType,
  PositionTravelRequirement,
  PositionWorkModel,
} from "../../../types/position"

type PositionWorkArrangementStepProps = {
  weeklyWorkloadHours: string
  workModel: PositionWorkModel
  employmentType: PositionEmploymentType
  travelRequirement: PositionTravelRequirement
  onWeeklyWorkloadHoursChange: (
    value: string
  ) => void
  onWorkModelChange: (
    value: PositionWorkModel
  ) => void
  onEmploymentTypeChange: (
    value: PositionEmploymentType
  ) => void
  onTravelRequirementChange: (
    value: PositionTravelRequirement
  ) => void
}

export function PositionWorkArrangementStep({
  weeklyWorkloadHours,
  workModel,
  employmentType,
  travelRequirement,
  onWeeklyWorkloadHoursChange,
  onWorkModelChange,
  onEmploymentTypeChange,
  onTravelRequirementChange,
}: PositionWorkArrangementStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="position-weekly-workload">
          Carga horária semanal
        </Label>

        <Input
          id="position-weekly-workload"
          type="number"
          min={1}
          max={168}
          step={1}
          value={weeklyWorkloadHours}
          onChange={(event) =>
            onWeeklyWorkloadHoursChange(
              event.target.value
            )
          }
        />

        <p className="text-xs leading-5 text-muted-foreground">
          Informe a quantidade de horas previstas por semana.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="position-work-model">
          Modalidade de trabalho
        </Label>

        <select
          id="position-work-model"
          value={workModel}
          onChange={(event) =>
            onWorkModelChange(
              event.target.value as PositionWorkModel
            )
          }
          className={positionSelectClassName}
        >
          {workModelOptions.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            )
          )}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="position-employment-type">
          Regime contratual
        </Label>

        <select
          id="position-employment-type"
          value={employmentType}
          onChange={(event) =>
            onEmploymentTypeChange(
              event.target
                .value as PositionEmploymentType
            )
          }
          className={positionSelectClassName}
        >
          {employmentTypeOptions.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            )
          )}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="position-travel-requirement">
          Exigência de viagens
        </Label>

        <select
          id="position-travel-requirement"
          value={travelRequirement}
          onChange={(event) =>
            onTravelRequirementChange(
              event.target
                .value as PositionTravelRequirement
            )
          }
          className={positionSelectClassName}
        >
          {travelRequirementOptions.map(
            (option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            )
          )}
        </select>
      </div>
    </div>
  )
}

type PositionWorkArrangementSummaryProps = {
  weeklyWorkloadHours: string
  workModelLabel?: string
  employmentTypeLabel?: string
  travelRequirementLabel?: string
}

export function PositionWorkArrangementSummary({
  weeklyWorkloadHours,
  workModelLabel,
  employmentTypeLabel,
  travelRequirementLabel,
}: PositionWorkArrangementSummaryProps) {
  return (
    <ProductWizardSummary>
      {[
        weeklyWorkloadHours
          ? `${weeklyWorkloadHours}h semanais`
          : "Carga horária não informada",
        workModelLabel ||
          "Modalidade não informada",
        employmentTypeLabel ||
          "Regime não informado",
        travelRequirementLabel ||
          "Viagens não informadas",
      ].join(" · ")}
    </ProductWizardSummary>
  )
}
