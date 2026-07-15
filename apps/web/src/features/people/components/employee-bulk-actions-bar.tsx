"use client"

import {
  useMemo,
  useState,
  useTransition,
} from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_LABELS,
} from "../constants/employee-status"
import {
  bulkUpdateEmployeesAction,
  type BulkEmployeeChange,
  type BulkUpdateEmployeesResult,
} from "../actions/bulk-update-employees-action"
import type {
  Employee,
  EmployeeStatus,
} from "../types/employee"

type EmployeeSelectOption = {
  id: string
  name: string
}

type EmployeeBulkActionField =
  | BulkEmployeeChange["field"]
  | ""

type EmployeeBulkActionsBarProps = {
  selectedEmployees: Employee[]
  positions: EmployeeSelectOption[]
  teams: EmployeeSelectOption[]
  managers: EmployeeSelectOption[]
  onClearSelection: () => void
}

const selectClassName = [
  "h-10 w-full rounded-md border border-white/20 bg-white/10 px-3",
  "text-sm text-white outline-none transition-colors",
  "focus:border-white/40 focus:ring-2 focus:ring-white/20",
  "disabled:cursor-not-allowed disabled:opacity-50",
].join(" ")

function escapeCsvValue(value: unknown) {
  const normalizedValue =
    value === null || value === undefined
      ? ""
      : String(value)

  return `"${normalizedValue.replace(/"/g, '""')}"`
}

function downloadSelectedEmployees(
  employees: Employee[],
  positions: EmployeeSelectOption[],
  teams: EmployeeSelectOption[],
  managers: EmployeeSelectOption[]
) {
  const positionNameById = new Map(
    positions.map((position) => [
      position.id,
      position.name,
    ])
  )

  const teamNameById = new Map(
    teams.map((team) => [
      team.id,
      team.name,
    ])
  )

  const managerNameById = new Map(
    managers.map((manager) => [
      manager.id,
      manager.name,
    ])
  )

  const headers = [
    "ID",
    "Nome",
    "E-mail",
    "Telefone",
    "Cargo",
    "Time",
    "Gestor",
    "Status",
    "Data de admissão",
  ]

  const rows = employees.map((employee) => [
    employee.id,
    employee.full_name,
    employee.email ?? "",
    employee.phone ?? "",
    employee.position_id
      ? positionNameById.get(employee.position_id) ?? ""
      : "",
    employee.team_id
      ? teamNameById.get(employee.team_id) ?? ""
      : "",
    employee.manager_id
      ? managerNameById.get(employee.manager_id) ?? ""
      : "",
    EMPLOYEE_STATUS_LABELS[employee.status],
    employee.hire_date ?? "",
  ])

  const csvContent = [
    headers,
    ...rows,
  ]
    .map((row) =>
      row.map(escapeCsvValue).join(";")
    )
    .join("\n")

  const blob = new Blob(
    [`\uFEFF${csvContent}`],
    {
      type: "text/csv;charset=utf-8",
    }
  )

  const downloadUrl = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.href = downloadUrl
  anchor.download = `colaboradores-selecionados-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  URL.revokeObjectURL(downloadUrl)
}

export function EmployeeBulkActionsBar({
  selectedEmployees,
  positions,
  teams,
  managers,
  onClearSelection,
}: EmployeeBulkActionsBarProps) {
  const router = useRouter()

  const [isPending, startTransition] =
    useTransition()

  const [field, setField] =
    useState<EmployeeBulkActionField>("")

  const [value, setValue] = useState("")

  const [result, setResult] =
    useState<BulkUpdateEmployeesResult | null>(null)

  const availableOptions = useMemo(() => {
    switch (field) {
      case "positionId":
        return positions

      case "teamId":
        return teams

      case "managerId":
        return managers

      default:
        return []
    }
  }, [
    field,
    managers,
    positions,
    teams,
  ])

  function handleFieldChange(
    nextField: EmployeeBulkActionField
  ) {
    setField(nextField)
    setValue("")
    setResult(null)
  }

  function createChange(): BulkEmployeeChange | null {
    switch (field) {
      case "status":
        if (!EMPLOYEE_STATUSES.includes(
          value as EmployeeStatus
        )) {
          return null
        }

        return {
          field,
          value: value as EmployeeStatus,
        }

      case "positionId":
      case "teamId":
      case "managerId":
        return {
          field,
          value,
        }

      default:
        return null
    }
  }

  function handleApply() {
    const change = createChange()

    if (!change) {
      setResult({
        success: false,
        message:
          "Selecione uma ação e um valor válido.",
        updatedCount: 0,
        failedCount: 0,
        errors: [],
      })

      return
    }

    startTransition(async () => {
      const actionResult =
        await bulkUpdateEmployeesAction({
          employeeIds: selectedEmployees.map(
            (employee) => employee.id
          ),
          change,
        })

      setResult(actionResult)

      if (actionResult.success) {
        router.refresh()
        onClearSelection()
        setField("")
        setValue("")
      }
    })
  }

  return (
    <section className="space-y-4 rounded-xl border border-slate-900 bg-slate-950 p-4 text-white shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">
            {selectedEmployees.length} colaborador
            {selectedEmployees.length === 1
              ? ""
              : "es"}{" "}
            selecionado
            {selectedEmployees.length === 1
              ? ""
              : "s"}
          </p>

          <p className="mt-1 text-sm text-slate-300">
            A alteração escolhida será aplicada a toda a seleção.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadSelectedEmployees(
                selectedEmployees,
                positions,
                teams,
                managers
              )
            }
          >
            Exportar selecionados
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClearSelection}
          >
            Limpar seleção
          </Button>
        </div>
      </div>

      <div className="grid gap-3 border-t border-white/10 pt-4 lg:grid-cols-[220px_minmax(220px,1fr)_auto]">
        <select
          aria-label="Selecionar ação em lote"
          value={field}
          onChange={(event) =>
            handleFieldChange(
              event.target
                .value as EmployeeBulkActionField
            )
          }
          className={selectClassName}
        >
          <option value="" className="text-slate-950">
            Selecionar ação
          </option>

          <option
            value="status"
            className="text-slate-950"
          >
            Alterar status
          </option>

          <option
            value="positionId"
            className="text-slate-950"
          >
            Alterar cargo
          </option>

          <option
            value="teamId"
            className="text-slate-950"
          >
            Alterar time
          </option>

          <option
            value="managerId"
            className="text-slate-950"
          >
            Alterar gestor
          </option>
        </select>

        {field === "status" ? (
          <select
            aria-label="Selecionar novo status"
            value={value}
            onChange={(event) =>
              setValue(event.target.value)
            }
            className={selectClassName}
          >
            <option
              value=""
              className="text-slate-950"
            >
              Selecione o status
            </option>

            {EMPLOYEE_STATUSES.map((status) => (
              <option
                key={status}
                value={status}
                className="text-slate-950"
              >
                {EMPLOYEE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        ) : null}

        {field && field !== "status" ? (
          <select
            aria-label="Selecionar novo valor"
            value={value}
            onChange={(event) =>
              setValue(event.target.value)
            }
            className={selectClassName}
          >
            <option
              value=""
              className="text-slate-950"
            >
              {field === "positionId"
                ? "Sem cargo"
                : field === "teamId"
                  ? "Sem time"
                  : "Sem gestor"}
            </option>

            {availableOptions.map((option) => (
              <option
                key={option.id}
                value={option.id}
                className="text-slate-950"
              >
                {option.name}
              </option>
            ))}
          </select>
        ) : null}

        <Button
          type="button"
          onClick={handleApply}
          disabled={
            isPending ||
            !field
          }
        >
          {isPending
            ? "Aplicando..."
            : "Aplicar alteração"}
        </Button>
      </div>

      {result ? (
        <div
          role="status"
          className={[
            "rounded-lg px-3 py-2 text-sm",
            result.success
              ? "bg-emerald-500/15 text-emerald-100"
              : "bg-red-500/15 text-red-100",
          ].join(" ")}
        >
          {result.message}

          {result.failedCount > 0 ? (
            <span>
              {" "}
              {result.failedCount} registro
              {result.failedCount === 1
                ? ""
                : "s"}{" "}
              apresentou
              {result.failedCount === 1
                ? ""
                : "aram"}{" "}
              erro.
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
