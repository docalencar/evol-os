"use client"

import Link from "next/link"
import {
  useEffect,
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
  EmployeeWorkspacePagination,
} from "./employee-workspace-pagination"
import {
  EmployeeWorkspaceToolbar,
  type EmployeeWorkspaceFilters,
  type EmployeeWorkspaceSortBy,
  type EmployeeWorkspaceSortDirection,
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

const INITIAL_PAGE_SIZE = 25

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
  return (
    matchesSearch(
      employee,
      normalizeSearchValue(filters.search)
    ) &&
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

function getSortValue(
  employee: EmployeeTableItem,
  sortBy: EmployeeWorkspaceSortBy
) {
  switch (sortBy) {
    case "position":
      return getRelationName(employee.positions)

    case "team":
      return getRelationName(employee.teams)

    case "manager":
      return employee.manager_name ?? ""

    case "status":
      return (
        EMPLOYEE_STATUS_LABELS[
          employee.status as EmployeeStatus
        ] ?? employee.status
      )

    case "fullName":
    default:
      return employee.full_name
  }
}

function sortEmployees(
  employees: EmployeeTableItem[],
  sortBy: EmployeeWorkspaceSortBy,
  sortDirection: EmployeeWorkspaceSortDirection
) {
  const direction = sortDirection === "asc" ? 1 : -1

  return [...employees].sort(
    (firstEmployee, secondEmployee) => {
      const firstValue = normalizeSearchValue(
        getSortValue(firstEmployee, sortBy)
      )

      const secondValue = normalizeSearchValue(
        getSortValue(secondEmployee, sortBy)
      )

      return (
        firstValue.localeCompare(
          secondValue,
          "pt-BR",
          {
            numeric: true,
            sensitivity: "base",
          }
        ) * direction
      )
    }
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

  const [sortBy, setSortBy] =
    useState<EmployeeWorkspaceSortBy>("fullName")

  const [sortDirection, setSortDirection] =
    useState<EmployeeWorkspaceSortDirection>("asc")

  const [currentPage, setCurrentPage] = useState(1)

  const [pageSize, setPageSize] =
    useState(INITIAL_PAGE_SIZE)

  const [selectedEmployeeIds, setSelectedEmployeeIds] =
    useState<Set<string>>(() => new Set())

  const filteredEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        matchesFilters(employee, filters)
      ),
    [employees, filters]
  )

  const sortedEmployees = useMemo(
    () =>
      sortEmployees(
        filteredEmployees,
        sortBy,
        sortDirection
      ),
    [
      filteredEmployees,
      sortBy,
      sortDirection,
    ]
  )

  const totalPages = Math.max(
    1,
    Math.ceil(sortedEmployees.length / pageSize)
  )

  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  )

  const firstItemIndex =
    (safeCurrentPage - 1) * pageSize

  const paginatedEmployees = useMemo(
    () =>
      sortedEmployees.slice(
        firstItemIndex,
        firstItemIndex + pageSize
      ),
    [
      sortedEmployees,
      firstItemIndex,
      pageSize,
    ]
  )

  const pageEmployeeIds = paginatedEmployees.map(
    (employee) => employee.id
  )

  const selectedCount = selectedEmployeeIds.size

  const selectedOnCurrentPageCount =
    pageEmployeeIds.filter((employeeId) =>
      selectedEmployeeIds.has(employeeId)
    ).length

  const allCurrentPageSelected =
    pageEmployeeIds.length > 0 &&
    selectedOnCurrentPageCount === pageEmployeeIds.length

  const someCurrentPageSelected =
    selectedOnCurrentPageCount > 0 &&
    !allCurrentPageSelected

  const firstItem =
    sortedEmployees.length === 0
      ? 0
      : firstItemIndex + 1

  const lastItem = Math.min(
    firstItemIndex + pageSize,
    sortedEmployees.length
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [
    filters,
    pageSize,
    sortBy,
    sortDirection,
  ])

  useEffect(() => {
    const availableEmployeeIds = new Set(
      employees.map((employee) => employee.id)
    )

    setSelectedEmployeeIds((currentSelection) => {
      const nextSelection = new Set(
        [...currentSelection].filter((employeeId) =>
          availableEmployeeIds.has(employeeId)
        )
      )

      return nextSelection
    })
  }, [employees])

  function clearFilters() {
    setFilters(INITIAL_FILTERS)
  }

  function clearSelection() {
    setSelectedEmployeeIds(new Set())
  }

  function toggleEmployeeSelection(employeeId: string) {
    setSelectedEmployeeIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)

      if (nextSelection.has(employeeId)) {
        nextSelection.delete(employeeId)
      } else {
        nextSelection.add(employeeId)
      }

      return nextSelection
    })
  }

  function toggleCurrentPageSelection() {
    setSelectedEmployeeIds((currentSelection) => {
      const nextSelection = new Set(currentSelection)

      if (allCurrentPageSelected) {
        for (const employeeId of pageEmployeeIds) {
          nextSelection.delete(employeeId)
        }
      } else {
        for (const employeeId of pageEmployeeIds) {
          nextSelection.add(employeeId)
        }
      }

      return nextSelection
    })
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
        sortBy={sortBy}
        sortDirection={sortDirection}
        onFiltersChange={setFilters}
        onSortByChange={setSortBy}
        onSortDirectionChange={setSortDirection}
        onClear={clearFilters}
      />

      {selectedCount > 0 ? (
        <section className="flex flex-col gap-3 rounded-xl border border-slate-900 bg-slate-950 p-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">
              {selectedCount} colaborador
              {selectedCount === 1 ? "" : "es"} selecionado
              {selectedCount === 1 ? "" : "s"}
            </p>

            <p className="mt-1 text-sm text-slate-300">
              A seleção será usada nas próximas ações em lote.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={clearSelection}
          >
            Limpar seleção
          </Button>
        </section>
      ) : null}

      <DataTable
        title="Colaboradores"
        data={paginatedEmployees}
        rowKey={(employee) => employee.id}
        emptyMessage={
          employees.length === 0
            ? "Nenhum colaborador cadastrado."
            : "Nenhum colaborador corresponde aos filtros."
        }
        columns={[
          {
            key: "selection",
            header: (
              <input
                type="checkbox"
                aria-label="Selecionar todos os colaboradores desta página"
                checked={allCurrentPageSelected}
                ref={(element) => {
                  if (element) {
                    element.indeterminate =
                      someCurrentPageSelected
                  }
                }}
                onChange={toggleCurrentPageSelection}
                className="h-4 w-4 rounded border-slate-300"
              />
            ),
            render: (employee) => (
              <input
                type="checkbox"
                aria-label={`Selecionar ${employee.full_name}`}
                checked={selectedEmployeeIds.has(employee.id)}
                onChange={() =>
                  toggleEmployeeSelection(employee.id)
                }
                className="h-4 w-4 rounded border-slate-300"
              />
            ),
          },
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

      <EmployeeWorkspacePagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={sortedEmployees.length}
        firstItem={firstItem}
        lastItem={lastItem}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}
