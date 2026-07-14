"use client"

import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

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

      toast.success("Participantes adicionados com sucesso.")
      setSelectedEmployeeIds([])
      setOpen(false)
    })
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled || isPending}
      >
        Adicionar participantes
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-background p-6 shadow-xl">
            <div>
              <h2 className="text-lg font-semibold">
                Participantes do ciclo
              </h2>

              <p className="mt-2 text-sm text-muted-foreground">
                Selecione os colaboradores que participarão deste
                ciclo de avaliação.
              </p>
            </div>

            <div className="mt-6 max-h-96 space-y-2 overflow-y-auto">
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
                        "flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors",
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

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
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
        </div>
      ) : null}
    </>
  )
}
