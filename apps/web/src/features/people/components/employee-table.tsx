"use client"

import Link from "next/link"
import {
  useMemo,
  useState,
} from "react"

import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

import {
  EMPLOYEE_STATUS_LABELS,
} from "../constants/employee-status"
import type {
  Employee,
  EmployeeStatus,
} from "../types/employee"
import { ArchiveEmployeeButton } from "./archive-employee-button"
import { EmployeeEditDialog } from "./employee-edit-dialog"
import {
  EmployeeWorkspaceToolbar,
  type EmployeeWorkspaceFilters,
} from "./employee-workspace-toolbar"

type EmployeeSelectOption = {
  id: string
  name: string
}

type Relation =
  | { name: string }
  | { name: string }[]
  | null

type EmployeeTableItem = Employee & {
  teams?: Relation
  positions?: Relation
  manager_name?: string | null
}

const INITIAL_FILTERS: EmployeeWorkspaceFilters = {
  search: "",
  positionId: "",
  teamId: "",
  managerId: "",
  status: "",
}

function getRelationName(relation?: Relation) {
  if (!relation) {
    return "-"
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name || "-"
  }

  return relation.name || "-"
}

function normalizeSearchValue(
  value: string | null | undefined
) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function matchesSearch(
  employee: EmployeeTableItem,
  normalizedSearch: string
) {
  if (!normalizedSearch) {
    return true
  }

  const searchableValues = [
    employee.full_name,
    employee.email,
    getRelationName(employee.positions),
    getRelationName(employee.teams),
    employee.manager_name,
  ]

  return searchableValues.some((value) =>
    normalizeSearchValue(value).includes(
      normalizedSearch
    )
  )
}

function matchesFilters(
  employee: EmployeeTableItem,
  filters: EmployeeWorkspaceFilters
) {
  const normalizedSearch =
    normalizeSearchValue(filters.search)

  return (
    matchesSearch(employee, normalizedSearch) &&
    (
      !filters.positionId ||
      employee.position_id === filters.positionId
    ) &&
    (
      !filters.teamId ||
      employee.team_id === filters.teamId
    ) &&
    (
      !filters.managerId ||
      employee.manager_id === filters.managerId
    ) &&
    (
      !filters.status ||
      employee.status === filters.status
    )
  )
}

type EmployeeTableProps = {
  employees: EmployeeTableItem[]
  teams: EmployeeSelectOption[]
  positions: EmployeeSelectOption[]
  managers: EmployeeSelectOption[]
}

export function EmployeeTable({
  employees,
  teams,
  positions,
  managers,
}: EmployeeTableProps) {
  const [filters, setFilters] =
    useState<EmployeeWorkspaceFilters>(
      INITIAL_FILTERS
    )

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        matchesFilters(employee, filters)
      ),
    [employees, filters]
  )

  function clearFilters() {
    setFilters(INITIAL_FILTERS)
  }

  return (
    <div className="space-y-4">
      <EmployeeWorkspaceToolbar
        filters={filters}
        positions={positions}
        teams={teams}
        managers={managers}
        resultCount={filteredEmployees.length}
        totalCount={employees.length}
        onFiltersChange={setFilters}
        onClear={clearFilters}
      />

      <DataTable
        title="Colaboradores"
        data={filteredEmployees}
        rowKey={(employee) => employee.id}
        emptyMessage={
          employees.length === 0
            ? "Nenhum colaborador cadastrado."
            : "Nenhum colaborador corresponde aos filtros."
        }
        columns={[
          {
            key: "full_name",
            header: "Nome",
            render: (employee) => (
              <span className="font-medium text-slate-900">
                {employee.full_name}
              </span>
            ),
          },
          {
            key: "position",
            header: "Cargo",
            render: (employee) =>
              getRelationName(employee.positions),
          },
          {
            key: "team",
            header: "Time",
            render: (employee) =>
              getRelationName(employee.teams),
          },
          {
            key: "manager",
            header: "Gestor",
            render: (employee) =>
              employee.manager_name || "-",
          },
          {
            key: "email",
            header: "E-mail",
            render: (employee) =>
              employee.email || "Sem e-mail",
          },
          {
            key: "status",
            header: "Status",
            render: (employee) => (
              <Badge>
                {
                  EMPLOYEE_STATUS_LABELS[
                    employee.status as EmployeeStatus
                  ]
                }
              </Badge>
            ),
          },
          {
            key: "actions",
            header: "Ações",
            render: (employee) => (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  render={
                    <Link
                      href={`/app/people/${employee.id}`}
                    />
                  }
                >
                  Ver perfil
                </Button>

                <EmployeeEditDialog
                  companyId={employee.company_id}
                  employee={employee}
                  teams={teams}
                  positions={positions}
                  managers={managers}
                />

                <ArchiveEmployeeButton
                  companyId={employee.company_id}
                  employeeId={employee.id}
                />
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
