"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import { changeJobOpeningStatusAction } from "../actions"
import { JOB_OPENING_STATUS_LABELS } from "../constants/job-opening-options"
import type { JobOpeningStatus } from "../types/job-opening"

type EmployeeOption = {
  id: string
  fullName: string
}

type JobOpeningStatusActionsProps = {
  jobOpeningId: string
  currentStatus: JobOpeningStatus
  allowedTransitions: JobOpeningStatus[]
  approverId: string | null
  employees: EmployeeOption[]
}

type ActionConfig = {
  label: string
  loadingLabel: string
  confirmTitle: string
  confirmDescription: string
  variant: "default" | "secondary" | "destructive"
}

function getActionConfig(
  currentStatus: JobOpeningStatus,
  targetStatus: JobOpeningStatus
): ActionConfig {
  if (targetStatus === "draft") {
    return {
      label: "Voltar para rascunho",
      loadingLabel: "Retornando...",
      confirmTitle: "Voltar a vaga para rascunho?",
      confirmDescription:
        "A vaga voltará ao estado de preparação e perderá a aprovação atual.",
      variant: "secondary",
    }
  }

  if (targetStatus === "pending_approval") {
    return {
      label: "Enviar para aprovação",
      loadingLabel: "Enviando...",
      confirmTitle: "Enviar vaga para aprovação?",
      confirmDescription:
        "A vaga ficará aguardando a decisão do aprovador selecionado.",
      variant: "default",
    }
  }

  if (targetStatus === "approved") {
    return {
      label: "Aprovar vaga",
      loadingLabel: "Aprovando...",
      confirmTitle: "Aprovar esta vaga?",
      confirmDescription:
        "A vaga será marcada como aprovada e poderá ser aberta em seguida.",
      variant: "default",
    }
  }

  if (targetStatus === "open") {
    const reopening = currentStatus === "paused"

    return {
      label: reopening ? "Reabrir vaga" : "Abrir vaga",
      loadingLabel: reopening ? "Reabrindo..." : "Abrindo...",
      confirmTitle: reopening
        ? "Reabrir esta vaga?"
        : "Abrir esta vaga?",
      confirmDescription: reopening
        ? "A vaga voltará a receber movimentações do processo seletivo."
        : "A vaga será marcada como aberta.",
      variant: "default",
    }
  }

  if (targetStatus === "paused") {
    return {
      label: "Pausar vaga",
      loadingLabel: "Pausando...",
      confirmTitle: "Pausar esta vaga?",
      confirmDescription:
        "A vaga permanecerá registrada, mas ficará temporariamente pausada.",
      variant: "secondary",
    }
  }

  if (targetStatus === "filled") {
    return {
      label: "Marcar como preenchida",
      loadingLabel: "Atualizando...",
      confirmTitle: "Marcar vaga como preenchida?",
      confirmDescription:
        "A vaga será encerrada com o status de preenchida.",
      variant: "default",
    }
  }

  if (targetStatus === "closed") {
    return {
      label: "Encerrar vaga",
      loadingLabel: "Encerrando...",
      confirmTitle: "Encerrar esta vaga?",
      confirmDescription:
        "A vaga será encerrada e não terá novas transições disponíveis.",
      variant: "secondary",
    }
  }

  return {
    label: "Cancelar vaga",
    loadingLabel: "Cancelando...",
    confirmTitle: "Cancelar esta vaga?",
    confirmDescription:
      "A vaga será cancelada e não terá novas transições disponíveis.",
    variant: "destructive",
  }
}

export function JobOpeningStatusActions({
  jobOpeningId,
  currentStatus,
  allowedTransitions,
  approverId,
  employees,
}: JobOpeningStatusActionsProps) {
  const router = useRouter()
  const [selectedApproverId, setSelectedApproverId] =
    useState(approverId ?? "")
  const [pendingStatus, setPendingStatus] =
    useState<JobOpeningStatus | null>(null)
  const [isPending, startTransition] = useTransition()

  if (allowedTransitions.length === 0) {
    return (
      <Button type="button" variant="secondary" disabled>
        Nenhuma ação disponível
      </Button>
    )
  }

  function handleStatusChange(targetStatus: JobOpeningStatus) {
    setPendingStatus(targetStatus)

    startTransition(async () => {
      const result = await changeJobOpeningStatusAction({
        jobOpeningId,
        status: targetStatus,
        approverId:
          targetStatus === "pending_approval"
            ? selectedApproverId
            : undefined,
      })

      setPendingStatus(null)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      router.refresh()
    })
  }

  const needsApprover = allowedTransitions.includes(
    "pending_approval"
  )

  return (
    <div className="flex max-w-2xl flex-wrap items-center justify-end gap-2">
      {needsApprover ? (
        <label className="sr-only" htmlFor="job-opening-approver">
          Aprovador
        </label>
      ) : null}

      {needsApprover ? (
        <select
          id="job-opening-approver"
          value={selectedApproverId}
          onChange={(event) =>
            setSelectedApproverId(event.target.value)
          }
          disabled={isPending}
          className="h-8 min-w-44 rounded-none border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-200"
        >
          <option value="">Selecione o aprovador</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.fullName}
            </option>
          ))}
        </select>
      ) : null}

      {allowedTransitions.map((targetStatus) => {
        const config = getActionConfig(
          currentStatus,
          targetStatus
        )
        const disabled =
          isPending ||
          (targetStatus === "pending_approval" &&
            !selectedApproverId)

        return (
          <ConfirmDialog
            key={targetStatus}
            title={config.confirmTitle}
            description={config.confirmDescription}
            confirmLabel={config.label}
            loading={
              isPending && pendingStatus === targetStatus
            }
            onConfirm={() => handleStatusChange(targetStatus)}
          >
            <Button
              type="button"
              size="sm"
              variant={config.variant}
              disabled={disabled}
              title={
                targetStatus === "pending_approval" &&
                !selectedApproverId
                  ? "Selecione um aprovador"
                  : `Alterar status para ${JOB_OPENING_STATUS_LABELS[targetStatus]}`
              }
            >
              {isPending && pendingStatus === targetStatus
                ? config.loadingLabel
                : config.label}
            </Button>
          </ConfirmDialog>
        )
      })}
    </div>
  )
}
