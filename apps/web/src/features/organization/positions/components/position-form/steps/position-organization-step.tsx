import { ProductWizardSummary } from "@/components/product"
import { Label } from "@/components/ui/label"

import {
  hierarchicalLevelOptions,
  positionSelectClassName,
  statusOptions,
} from "../position-form-options"
import type {
  DepartmentOption,
} from "../types"
import type {
  PositionHierarchicalLevel,
  PositionStatus,
} from "../../../types/position"

type PositionOrganizationStepProps = {
  departments: DepartmentOption[]
  departmentId: string
  hierarchicalLevel: PositionHierarchicalLevel
  status: PositionStatus
  onDepartmentIdChange: (value: string) => void
  onHierarchicalLevelChange: (
    value: PositionHierarchicalLevel
  ) => void
  onStatusChange: (
    value: PositionStatus
  ) => void
}

export function PositionOrganizationStep({
  departments,
  departmentId,
  hierarchicalLevel,
  status,
  onDepartmentIdChange,
  onHierarchicalLevelChange,
  onStatusChange,
}: PositionOrganizationStepProps) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="position-department">
          Departamento responsável
        </Label>

        <select
          id="position-department"
          value={departmentId}
          onChange={(event) =>
            onDepartmentIdChange(
              event.target.value
            )
          }
          className={positionSelectClassName}
        >
          <option value="">
            Sem departamento
          </option>

          {departments.map(
            (department) => (
              <option
                key={department.id}
                value={department.id}
              >
                {department.name}
              </option>
            )
          )}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="position-hierarchical-level">
          Nível hierárquico
        </Label>

        <select
          id="position-hierarchical-level"
          value={hierarchicalLevel}
          onChange={(event) =>
            onHierarchicalLevelChange(
              event.target
                .value as PositionHierarchicalLevel
            )
          }
          className={positionSelectClassName}
        >
          {hierarchicalLevelOptions.map(
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
        <Label htmlFor="position-status">
          Status
        </Label>

        <select
          id="position-status"
          value={status}
          onChange={(event) =>
            onStatusChange(
              event.target.value as PositionStatus
            )
          }
          className={positionSelectClassName}
        >
          {statusOptions.map(
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

type PositionOrganizationSummaryProps = {
  departmentName?: string
  hierarchicalLevelLabel?: string
  statusLabel?: string
}

export function PositionOrganizationSummary({
  departmentName,
  hierarchicalLevelLabel,
  statusLabel,
}: PositionOrganizationSummaryProps) {
  return (
    <ProductWizardSummary>
      {[
        departmentName ||
          "Sem departamento",
        hierarchicalLevelLabel ||
          "Nível não informado",
        statusLabel ||
          "Status não informado",
      ].join(" · ")}
    </ProductWizardSummary>
  )
}
