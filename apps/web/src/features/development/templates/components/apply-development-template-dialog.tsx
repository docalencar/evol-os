"use client"

import {
  useState,
  useTransition,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { CrudCreateDialog } from "@/components/shared/crud/crud-create-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  DEVELOPMENT_PLAN_PRIORITIES,
  DEVELOPMENT_PLAN_PRIORITY_LABELS,
  type DevelopmentPlanPriority,
} from "@/features/development/constants/development-plan"

import {
  applyDevelopmentTemplateAction,
} from "@/features/development/actions/apply-development-template-action"

import type {
  Employee,
} from "@/features/people/types/employee"

type ApplyDevelopmentTemplateDialogProps = {
  templateId: string
  employees: Employee[]
}

export function ApplyDevelopmentTemplateDialog({
  templateId,
  employees,
}: ApplyDevelopmentTemplateDialogProps) {
  const router = useRouter()

  const [employeeId, setEmployeeId] =
    useState("")

  const [ownerId, setOwnerId] =
    useState("")

  const [priority, setPriority] =
    useState<DevelopmentPlanPriority>(
      "medium"
    )

  const [startDate, setStartDate] =
    useState("")

  const [dueDate, setDueDate] =
    useState("")

  const [isPending, startTransition] =
    useTransition()

  const activeEmployees = employees.filter(
    (employee) =>
      employee.status === "active" ||
      employee.status === "on_leave"
  )

  const hasEmployees =
    activeEmployees.length > 0

  function resetForm() {
    setEmployeeId("")
    setOwnerId("")
    setPriority("medium")
    setStartDate("")
    setDueDate("")
  }

  return (
    <CrudCreateDialog
      trigger={
        <Button disabled={!hasEmployees}>
          Aplicar ao colaborador
        </Button>
      }
      title="Aplicar template ao colaborador"
      description="Crie um plano de desenvolvimento a partir deste template."
    >
      {({ close }) => (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()

            startTransition(async () => {
              const result =
                await applyDevelopmentTemplateAction({
                  templateId,
                  employeeId,
                  ownerId,
                  priority,
                  startDate:
                    startDate || undefined,
                  dueDate:
                    dueDate || undefined,
                })

              if (!result.success) {
                toast.error(result.message)
                return
              }

              toast.success(result.message)

              resetForm()
              close()

              router.push(
                "/app/development"
              )
              router.refresh()
            })
          }}
        >
          <div>
            <Label htmlFor="employeeId">
              Colaborador
            </Label>

            <select
              id="employeeId"
              name="employeeId"
              value={employeeId}
              onChange={(event) =>
                setEmployeeId(
                  event.target.value
                )
              }
              className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              required
              disabled={isPending}
            >
              <option value="">
                Selecione um colaborador
              </option>

              {activeEmployees.map(
                (employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.full_name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <Label htmlFor="ownerId">
              Responsável
            </Label>

            <select
              id="ownerId"
              name="ownerId"
              value={ownerId}
              onChange={(event) =>
                setOwnerId(
                  event.target.value
                )
              }
              className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              disabled={isPending}
            >
              <option value="">
                Sem responsável definido
              </option>

              {activeEmployees.map(
                (employee) => (
                  <option
                    key={employee.id}
                    value={employee.id}
                  >
                    {employee.full_name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <Label htmlFor="priority">
              Prioridade
            </Label>

            <select
              id="priority"
              name="priority"
              value={priority}
              onChange={(event) =>
                setPriority(
                  event.target
                    .value as DevelopmentPlanPriority
                )
              }
              className="mt-1 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              disabled={isPending}
            >
              {DEVELOPMENT_PLAN_PRIORITIES.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {
                      DEVELOPMENT_PLAN_PRIORITY_LABELS[
                        item
                      ]
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="startDate">
                Data de início
              </Label>

              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(event) =>
                  setStartDate(
                    event.target.value
                  )
                }
                className="mt-1"
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="dueDate">
                Data prevista
              </Label>

              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                value={dueDate}
                min={startDate || undefined}
                onChange={(event) =>
                  setDueDate(
                    event.target.value
                  )
                }
                className="mt-1"
                disabled={isPending}
              />
            </div>
          </div>

          {!hasEmployees ? (
            <p className="text-sm text-amber-700">
              Nenhum colaborador disponível foi
              encontrado.
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm()
                close()
              }}
              disabled={isPending}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={
                isPending ||
                !employeeId
              }
            >
              {isPending
                ? "Criando plano..."
                : "Criar plano"}
            </Button>
          </div>
        </form>
      )}
    </CrudCreateDialog>
  )
}