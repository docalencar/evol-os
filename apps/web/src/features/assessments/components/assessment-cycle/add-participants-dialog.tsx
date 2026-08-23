"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"
import type { Employee } from "@/features/people/types/employee"

import { addCycleParticipantsAction } from "../../actions/add-cycle-participants-action"

type AddParticipantsDialogProps = {
  companyId: string
  assessmentCycleId: string
  employees: Employee[]
  disabled?: boolean
}

export function AddParticipantsDialog({
  companyId,
  assessmentCycleId,
  employees,
  disabled = false,
}: AddParticipantsDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<
    string[]
  >([])
  const [isPending, startTransition] = useTransition()

  const activeEmployees = useMemo(
    () =>
      employees.filter(
        (employee) => employee.status === "active"
      ),
    [employees]
  )

  function toggleEmployee(employeeId: string) {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    )
  }

  function handleClose() {
    if (isPending) {
      return
    }

    setOpen(false)
    setSelectedEmployeeIds([])
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setOpen(true)
      return
    }

    handleClose()
  }

  function handleAddParticipants() {
    startTransition(async () => {
      const result = await addCycleParticipantsAction({
        companyId,
        assessmentCycleId,
        employeeIds: selectedEmployeeIds,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      setSelectedEmployeeIds([])
      setOpen(false)
    })
  }

  return (
    <EntityDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={
        <Button type="button" disabled={disabled || isPending}>
          Adicionar participantes
        </Button>
      }
      title="Participantes do ciclo"
      description="Selecione os colaboradores que participarão deste ciclo de avaliação."
      contentClassName="max-h-[92dvh] max-w-2xl bg-white"
      bodyClassName="p-0 sm:p-0"
      dismissible={false}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4 sm:px-6">
              {activeEmployees.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Nenhum colaborador ativo disponível.
                </div>
              ) : (
                activeEmployees.map((employee) => {
                  const selected =
                    selectedEmployeeIds.includes(employee.id)

                  return (
                    <label
                      key={employee.id}
                      className={[
                        "flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 py-2.5 transition-colors",
                        selected
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50",
                        isPending
                          ? "cursor-not-allowed opacity-60"
                          : "",
                      ].join(" ")}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={isPending}
                        onChange={() =>
                          toggleEmployee(employee.id)
                        }
                        className="h-4 w-4"
                      />

                      <div className="min-w-0">
                        <p className="font-medium">
                          {employee.full_name}
                        </p>

                        <p className="truncate text-sm text-muted-foreground">
                          {employee.email ?? "Sem e-mail cadastrado"}
                        </p>
                      </div>
                    </label>
                  )
                })
              )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t bg-white px-5 py-4 sm:px-6">
              <p className="text-sm text-muted-foreground">
                {selectedEmployeeIds.length} participante(s)
                selecionado(s)
              </p>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isPending}
                >
                  Cancelar
                </Button>

                <Button
                  type="button"
                  onClick={handleAddParticipants}
                  disabled={
                    selectedEmployeeIds.length === 0 ||
                    isPending
                  }
                >
                  {isPending
                    ? "Adicionando..."
                    : "Adicionar selecionados"}
                </Button>
              </div>
        </div>
      </div>
    </EntityDialog>
  )
}
