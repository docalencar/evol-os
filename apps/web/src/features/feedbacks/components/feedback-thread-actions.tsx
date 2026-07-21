"use client"

import { useTransition } from "react"
import {
  Archive,
  CheckCircle2,
  CircleCheckBig,
} from "lucide-react"
import { toast } from "sonner"

import {
  ConfirmDialog,
} from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import {
  acknowledgeFeedbackThreadAction,
  archiveFeedbackThreadAction,
  closeFeedbackThreadAction,
} from "../actions"

type FeedbackThreadActionsProps = {
  threadId: string
  canAcknowledge: boolean
  canClose: boolean
  canArchive: boolean
}

export function FeedbackThreadActions({
  threadId,
  canAcknowledge,
  canClose,
  canArchive,
}: FeedbackThreadActionsProps) {
  const [
    isAcknowledging,
    startAcknowledging,
  ] = useTransition()

  const [
    isClosing,
    startClosing,
  ] = useTransition()

  const [
    isArchiving,
    startArchiving,
  ] = useTransition()

  function handleAcknowledge() {
    startAcknowledging(async () => {
      const result =
        await acknowledgeFeedbackThreadAction(
          threadId
        )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
    })
  }

  function handleClose() {
    startClosing(async () => {
      const result =
        await closeFeedbackThreadAction(
          threadId
        )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
    })
  }

  function handleArchive() {
    startArchiving(async () => {
      const result =
        await archiveFeedbackThreadAction(
          threadId
        )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
    })
  }

  if (
    !canAcknowledge &&
    !canClose &&
    !canArchive
  ) {
    return (
      <p className="text-sm text-slate-500">
        Nenhuma ação está disponível para o
        estado atual da conversa.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {canAcknowledge ? (
        <ConfirmDialog
          title="Confirmar recebimento?"
          description="Esta ação registrará que você recebeu e tomou ciência deste feedback."
          confirmLabel="Confirmar recebimento"
          loading={isAcknowledging}
          onConfirm={handleAcknowledge}
        >
          <Button
            className="w-full"
            disabled={isAcknowledging}
          >
            <CircleCheckBig className="h-4 w-4" />

            {isAcknowledging
              ? "Confirmando..."
              : "Confirmar recebimento"}
          </Button>
        </ConfirmDialog>
      ) : null}

      {canClose ? (
        <ConfirmDialog
          title="Encerrar conversa?"
          description="Depois de encerrada, esta conversa não aceitará novas respostas."
          confirmLabel="Encerrar"
          loading={isClosing}
          onConfirm={handleClose}
        >
          <Button
            variant="secondary"
            className="w-full"
            disabled={isClosing}
          >
            <CheckCircle2 className="h-4 w-4" />

            {isClosing
              ? "Encerrando..."
              : "Encerrar conversa"}
          </Button>
        </ConfirmDialog>
      ) : null}

      {canArchive ? (
        <ConfirmDialog
          title="Arquivar conversa?"
          description="A conversa permanecerá registrada, mas será marcada como arquivada."
          confirmLabel="Arquivar"
          loading={isArchiving}
          onConfirm={handleArchive}
        >
          <Button
            variant="secondary"
            className="w-full"
            disabled={isArchiving}
          >
            <Archive className="h-4 w-4" />

            {isArchiving
              ? "Arquivando..."
              : "Arquivar conversa"}
          </Button>
        </ConfirmDialog>
      ) : null}
    </div>
  )
}
