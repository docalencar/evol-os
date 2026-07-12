"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import {
  changeDevelopmentPlanStatusAction,
} from "../actions/change-development-plan-status-action"

import type {
  DevelopmentPlanStatus,
} from "../constants/development-plan"

type TargetStatus =
  | "active"
  | "completed"
  | "cancelled"

type DevelopmentPlanStatusButtonProps = {
  planId: string
  currentStatus: DevelopmentPlanStatus
  targetStatus: TargetStatus
}

type ButtonVariant =
  | "default"
  | "secondary"
  | "destructive"

type StatusButtonConfig = {
  buttonLabel: string
  loadingLabel: string
  confirmTitle: string
  confirmDescription: string
  confirmLabel: string
  successMessage: string
  variant: ButtonVariant
}

function getStatusButtonConfig(
  currentStatus: DevelopmentPlanStatus,
  targetStatus: TargetStatus
): StatusButtonConfig {
  if (
    currentStatus === "draft" &&
    targetStatus === "active"
  ) {
    return {
      buttonLabel: "Ativar",
      loadingLabel: "Ativando...",
      confirmTitle:
        "Ativar plano de desenvolvimento?",
      confirmDescription:
        "O PDI ficará ativo e poderá ser executado e acompanhado normalmente.",
      confirmLabel: "Ativar plano",
      successMessage:
        "Plano ativado com sucesso.",
      variant: "default",
    }
  }

  if (
    (currentStatus === "completed" ||
      currentStatus === "cancelled") &&
    targetStatus === "active"
  ) {
    return {
      buttonLabel: "Reabrir",
      loadingLabel: "Reabrindo...",
      confirmTitle:
        "Reabrir plano de desenvolvimento?",
      confirmDescription:
        "O PDI voltará ao status ativo e poderá ser editado e executado novamente.",
      confirmLabel: "Reabrir plano",
      successMessage:
        "Plano reaberto com sucesso.",
      variant: "secondary",
    }
  }

  if (
    currentStatus === "active" &&
    targetStatus === "completed"
  ) {
    return {
      buttonLabel: "Concluir",
      loadingLabel: "Concluindo...",
      confirmTitle:
        "Concluir plano de desenvolvimento?",
      confirmDescription:
        "O PDI será marcado como concluído e ficará disponível apenas para consulta. Ele poderá ser reaberto futuramente.",
      confirmLabel: "Concluir plano",
      successMessage:
        "Plano concluído com sucesso.",
      variant: "default",
    }
  }

  if (
    currentStatus === "active" &&
    targetStatus === "cancelled"
  ) {
    return {
      buttonLabel: "Cancelar",
      loadingLabel: "Cancelando...",
      confirmTitle:
        "Cancelar plano de desenvolvimento?",
      confirmDescription:
        "O PDI será cancelado e ficará disponível apenas para consulta. Todo o histórico de competências e ações será preservado.",
      confirmLabel: "Cancelar plano",
      successMessage:
        "Plano cancelado com sucesso.",
      variant: "destructive",
    }
  }

  throw new Error(
    "Transição de status não suportada."
  )
}

export function DevelopmentPlanStatusButton({
  planId,
  currentStatus,
  targetStatus,
}: DevelopmentPlanStatusButtonProps) {
  const [isPending, startTransition] =
    useTransition()

  const config =
    getStatusButtonConfig(
      currentStatus,
      targetStatus
    )

  function handleStatusChange() {
    startTransition(async () => {
      const result =
        await changeDevelopmentPlanStatusAction(
          planId,
          {
            status: targetStatus,
          }
        )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(
        config.successMessage
      )
    })
  }

  return (
    <ConfirmDialog
      title={config.confirmTitle}
      description={
        config.confirmDescription
      }
      confirmLabel={
        config.confirmLabel
      }
      loading={isPending}
      onConfirm={handleStatusChange}
    >
      <Button
        variant={config.variant}
        size="sm"
        disabled={isPending}
      >
        {isPending
          ? config.loadingLabel
          : config.buttonLabel}
      </Button>
    </ConfirmDialog>
  )
}