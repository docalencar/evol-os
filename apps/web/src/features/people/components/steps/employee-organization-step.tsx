import { ProductWizardSummary } from "@/components/product"
import { Label } from "@/components/ui/label"

import type { PositionSeniorityOption } from "../../queries/get-people-seniority-options"

type EmployeeSelectOption = {
  id: string
  name: string
}

type CurrentHistoricalSeniority = {
  profileId: string
  label: string
}

type EmployeeOrganizationStepProps = {
  teams: EmployeeSelectOption[]
  positions: EmployeeSelectOption[]
  managers: EmployeeSelectOption[]
  teamId: string
  positionId: string
  managerId: string
  seniorityOptions: PositionSeniorityOption[]
  positionSeniorityProfileId: string
  currentHistoricalSeniority: CurrentHistoricalSeniority | null
  onTeamIdChange: (value: string) => void
  onPositionIdChange: (value: string) => void
  onManagerIdChange: (value: string) => void
  onPositionSeniorityProfileIdChange: (value: string) => void
}

const selectClassName =
  "mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"

export function EmployeeOrganizationStep({
  teams,
  positions,
  managers,
  teamId,
  positionId,
  managerId,
  seniorityOptions,
  positionSeniorityProfileId,
  currentHistoricalSeniority,
  onTeamIdChange,
  onPositionIdChange,
  onManagerIdChange,
  onPositionSeniorityProfileIdChange,
}: EmployeeOrganizationStepProps) {
  const hasSpecificSeniorities = seniorityOptions.length > 0
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="employee-team">
          Time
        </Label>

        <select
          id="employee-team"
          value={teamId}
          onChange={(event) =>
            onTeamIdChange(event.target.value)
          }
          className={selectClassName}
        >
          <option value="">Sem time</option>

          {teams.map((team) => (
            <option
              key={team.id}
              value={team.id}
            >
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="employee-position">
          Cargo
        </Label>

        <select
          id="employee-position"
          value={positionId}
          onChange={(event) =>
            onPositionIdChange(event.target.value)
          }
          className={selectClassName}
        >
          <option value="">Sem cargo</option>

          {positions.map((position) => (
            <option
              key={position.id}
              value={position.id}
            >
              {position.name}
            </option>
          ))}
        </select>
      </div>

      {positionId && (
        <div>
          <Label htmlFor="employee-seniority">
            Senioridade
          </Label>

          {hasSpecificSeniorities ||
          currentHistoricalSeniority ? (
            <select
              id="employee-seniority"
              value={positionSeniorityProfileId}
              onChange={(event) =>
                onPositionSeniorityProfileIdChange(
                  event.target.value
                )
              }
              className={selectClassName}
            >
              <option value="">
                Sem senioridade específica
              </option>

              {seniorityOptions.map((option) => (
                <option
                  key={option.profileId}
                  value={option.profileId}
                >
                  {option.label}
                </option>
              ))}

              {currentHistoricalSeniority && (
                <option
                  value={
                    currentHistoricalSeniority.profileId
                  }
                >
                  {`${currentHistoricalSeniority.label} (arquivada)`}
                </option>
              )}
            </select>
          ) : (
            <p className="mt-1 text-sm text-slate-500">
              Este cargo não possui senioridades
              específicas configuradas.
            </p>
          )}
        </div>
      )}

      <div>
        <Label htmlFor="employee-manager">
          Gestor
        </Label>

        <select
          id="employee-manager"
          value={managerId}
          onChange={(event) =>
            onManagerIdChange(event.target.value)
          }
          className={selectClassName}
        >
          <option value="">Sem gestor</option>

          {managers.map((manager) => (
            <option
              key={manager.id}
              value={manager.id}
            >
              {manager.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

type EmployeeOrganizationSummaryProps = {
  teamName?: string
  positionName?: string
  managerName?: string
}

export function EmployeeOrganizationSummary({
  teamName,
  positionName,
  managerName,
}: EmployeeOrganizationSummaryProps) {
  const details = [
    teamName || "Sem time",
    positionName || "Sem cargo",
    managerName
      ? `Gestor: ${managerName}`
      : "Sem gestor",
  ]

  return (
    <ProductWizardSummary>
      {details.join(" · ")}
    </ProductWizardSummary>
  )
}
