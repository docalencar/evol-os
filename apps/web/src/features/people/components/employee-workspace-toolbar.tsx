import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABELS,
} from "../constants/employee-status"
import type {
  EmployeeStatus,
} from "../types/employee"

export type EmployeeWorkspaceFilterOption = {
  id: string
  name: string
}

export type EmployeeWorkspaceFilters = {
  search: string
  positionId: string
  teamId: string
  managerId: string
  status: string
}

type EmployeeWorkspaceToolbarProps = {
  filters: EmployeeWorkspaceFilters
  positions: EmployeeWorkspaceFilterOption[]
  teams: EmployeeWorkspaceFilterOption[]
  managers: EmployeeWorkspaceFilterOption[]
  resultCount: number
  totalCount: number
  onFiltersChange: (
    filters: EmployeeWorkspaceFilters
  ) => void
  onClear: () => void
}

const selectClassName = [
  "h-10 w-full rounded-md border border-slate-200 bg-white px-3",
  "text-sm text-slate-900 outline-none transition-colors",
  "focus:border-slate-400 focus:ring-2 focus:ring-slate-200",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

export function EmployeeWorkspaceToolbar({
  filters,
  positions,
  teams,
  managers,
  resultCount,
  totalCount,
  onFiltersChange,
  onClear,
}: EmployeeWorkspaceToolbarProps) {
  const hasActiveFilters = Object.values(filters).some(
    (value) => value.trim().length > 0
  )

  function updateFilter(
    key: keyof EmployeeWorkspaceFilters,
    value: string
  ) {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="w-full lg:max-w-md">
          <label
            htmlFor="employee-search"
            className="sr-only"
          >
            Buscar colaboradores
          </label>

          <Input
            id="employee-search"
            type="search"
            value={filters.search}
            onChange={(event) =>
              updateFilter("search", event.target.value)
            }
            placeholder="Buscar por nome, e-mail, cargo, time ou gestor..."
          />
        </div>

        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label
              htmlFor="employee-position-filter"
              className="sr-only"
            >
              Filtrar por cargo
            </label>

            <select
              id="employee-position-filter"
              value={filters.positionId}
              onChange={(event) =>
                updateFilter(
                  "positionId",
                  event.target.value
                )
              }
              className={selectClassName}
            >
              <option value="">Todos os cargos</option>

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

          <div>
            <label
              htmlFor="employee-team-filter"
              className="sr-only"
            >
              Filtrar por time
            </label>

            <select
              id="employee-team-filter"
              value={filters.teamId}
              onChange={(event) =>
                updateFilter("teamId", event.target.value)
              }
              className={selectClassName}
            >
              <option value="">Todos os times</option>

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
            <label
              htmlFor="employee-manager-filter"
              className="sr-only"
            >
              Filtrar por gestor
            </label>

            <select
              id="employee-manager-filter"
              value={filters.managerId}
              onChange={(event) =>
                updateFilter(
                  "managerId",
                  event.target.value
                )
              }
              className={selectClassName}
            >
              <option value="">Todos os gestores</option>

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

          <div>
            <label
              htmlFor="employee-status-filter"
              className="sr-only"
            >
              Filtrar por status
            </label>

            <select
              id="employee-status-filter"
              value={filters.status}
              onChange={(event) =>
                updateFilter("status", event.target.value)
              }
              className={selectClassName}
            >
              <option value="">Todos os status</option>

              {EMPLOYEE_STATUSES.map((status) => (
                <option
                  key={status}
                  value={status}
                >
                  {
                    EMPLOYEE_STATUS_LABELS[
                      status as EmployeeStatus
                    ]
                  }
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p
          className="text-sm text-slate-500"
          aria-live="polite"
        >
          {resultCount === totalCount
            ? `${totalCount} colaborador${
                totalCount === 1 ? "" : "es"
              }`
            : `${resultCount} de ${totalCount} colaboradores`}
        </p>

        {hasActiveFilters ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClear}
          >
            Limpar filtros
          </Button>
        ) : null}
      </div>
    </section>
  )
}
