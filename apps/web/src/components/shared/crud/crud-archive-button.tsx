"use client"

import { useTransition } from "react"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

type CrudArchiveButtonProps = {
  title: string
  description: string
  confirmLabel?: string
  pendingLabel?: string
  idleLabel?: string
  onArchive: () => Promise<void>
}

export function CrudArchiveButton({
  title,
  description,
  confirmLabel = "Arquivar",
  pendingLabel = "Arquivando...",
  idleLabel = "Arquivar",
  onArchive,
}: CrudArchiveButtonProps) {
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      await onArchive()
    })
  }

  return (
    <ConfirmDialog
      title={title}
      description={description}
      confirmLabel={confirmLabel}
      loading={isPending}
      onConfirm={handleArchive}
    >
      <Button
        variant="secondary"
        size="sm"
        disabled={isPending}
      >
        {isPending
          ? pendingLabel
          : idleLabel}
      </Button>
    </ConfirmDialog>
  )
}
