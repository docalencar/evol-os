"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { DataTable } from "@/components/shared/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { EMPLOYEE_STATUS_LABELS } from "../constants/employee-status"
import type { Employee, EmployeeStatus } from "../types/employee"
import { ArchiveEmployeeButton } from "./archive-employee-button"
import { EmployeeEditDialog } from "./employee-edit-dialog"

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

function getRelationName(relation?: Relation) {
  if (!relation) {
    return "-"
  }

  if (Array.isArray(relation)) {
    return relation[0]?.name || "-"
  }

  return relation.name || "-"
}

function normalizeSearchValue(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

function matchesEmployeeSearch(
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
    normalizeSearchValue(value).includes(normalizedSearch)
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
  const [search, setSearch] = useState("")

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search)

    return employees.filter((employee) =>
      matchesEmployeeSearch(employee, normalizedSearch)
    )
  }, [employees, search])

  const resultLabel =
    filteredEmployees.length === 1
      ? "1 colaborador encontrado"
      : `${filteredEmployees.length} colaboradores encontrados`

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-md">
            <label
              htmlFor="employee-search"
              className="sr-only"
            >
              Buscar colaboradores
            </label>

            <Input
              id="employee-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, e-mail, cargo, time ou gestor..."
            />
          </div>

          <p
            className="shrink-0 text-sm text-slate-500"
            aria-live="polite"
          >
            {resultLabel}
          </p>
        </div>
      </section>

      <DataTable
        title="Colaboradores"
        data={filteredEmployees}
        rowKey={(employee) => employee.id}
        emptyMessage={
          search.trim()
            ? "Nenhum colaborador corresponde à busca."
            : "Nenhum colaborador cadastrado."
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
