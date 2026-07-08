"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/shared/confirm-dialog"
import { Button } from "@/components/ui/button"

import { archiveEmployeeAction } from "../actions/archive-employee-action"

type Props = {
  companyId: string
  employeeId: string
}

export function ArchiveEmployeeButton({ companyId, employeeId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleArchive() {
    startTransition(async () => {
      const result = await archiveEmployeeAction(companyId, employeeId)

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
    })
  }

  return (
    <ConfirmDialog
      title="Arquivar colaborador?"
      description="O colaborador será marcado como desligado e deixará de aparecer nas listagens padrão."
      confirmLabel="Arquivar"
      loading={isPending}
      onConfirm={handleArchive}
    >
      <Button variant="secondary" size="sm" disabled={isPending}>
        {isPending ? "Arquivando..." : "Arquivar"}
      </Button>
    </ConfirmDialog>
  )
}
