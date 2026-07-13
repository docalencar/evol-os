import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  employmentTypeOptions,
  positionSelectClassName,
  travelRequirementOptions,
  workModelOptions,
} from "./position-form-options"
import type { PositionFormPosition } from "./types"

type PositionWorkArrangementSectionProps = {
  position?: PositionFormPosition
}

export function PositionWorkArrangementSection({
  position,
}: PositionWorkArrangementSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="weeklyWorkloadHours">
          Carga horária semanal
        </Label>

        <Input
          id="weeklyWorkloadHours"
          name="weeklyWorkloadHours"
          type="number"
          min={1}
          max={168}
          step={1}
          defaultValue={position?.weekly_workload_hours ?? 44}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="workModel">Modalidade de trabalho</Label>

        <select
          id="workModel"
          name="workModel"
          className={positionSelectClassName}
          defaultValue={position?.work_model ?? "on_site"}
          required
        >
          {workModelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="employmentType">Regime contratual</Label>

        <select
          id="employmentType"
          name="employmentType"
          className={positionSelectClassName}
          defaultValue={position?.employment_type ?? "clt"}
          required
        >
          {employmentTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="travelRequirement">
          Exigência de viagens
        </Label>

        <select
          id="travelRequirement"
          name="travelRequirement"
          className={positionSelectClassName}
          defaultValue={position?.travel_requirement ?? "none"}
          required
        >
          {travelRequirementOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
