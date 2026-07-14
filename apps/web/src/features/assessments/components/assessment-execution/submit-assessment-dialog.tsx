"use client"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

type SubmitAssessmentDialogProps = {
  disabled: boolean
  loading?: boolean
  onConfirm: () => void
}

export function SubmitAssessmentDialog({
  disabled,
  loading = false,
  onConfirm,
}: SubmitAssessmentDialogProps) {
  return (
    <ConfirmDialog
      title="Concluir avaliação?"
      description="Após o envio, a avaliação ficará bloqueada para edição. Revise suas respostas antes de confirmar."
      confirmLabel="Confirmar envio"
      loading={loading}
      onConfirm={onConfirm}
    >
      <Button
        type="button"
        disabled={disabled || loading}
      >
        {loading ? "Enviando..." : "Enviar avaliação"}
      </Button>
    </ConfirmDialog>
  )
}
