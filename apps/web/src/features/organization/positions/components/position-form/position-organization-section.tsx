import { Label } from "@/components/ui/label"

import {
  hierarchicalLevelOptions,
  positionSelectClassName,
  statusOptions,
} from "./position-form-options"
import type {
  DepartmentOption,
  PositionFormPosition,
} from "./types"

type PositionOrganizationSectionProps = {
  departments: DepartmentOption[]
  position?: PositionFormPosition
}

export function PositionOrganizationSection({
  departments,
  position,
}: PositionOrganizationSectionProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="departmentId">Departamento responsável</Label>

        <select
          id="departmentId"
          name="departmentId"
          className={positionSelectClassName}
          defaultValue={position?.department_id ?? ""}
        >
          <option value="">Sem departamento</option>

          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hierarchicalLevel">Nível hierárquico</Label>

        <select
          id="hierarchicalLevel"
          name="hierarchicalLevel"
          className={positionSelectClassName}
          defaultValue={position?.hierarchical_level ?? "analyst"}
          required
        >
          {hierarchicalLevelOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>

        <select
          id="status"
          name="status"
          className={positionSelectClassName}
          defaultValue={position?.status ?? "active"}
          required
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}