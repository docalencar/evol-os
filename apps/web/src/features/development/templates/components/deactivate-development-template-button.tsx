"use client"

import { toast } from "sonner"

import { CrudArchiveButton } from "@/components/shared/crud/crud-archive-button"

import { deactivateDevelopmentTemplateAction } from "../actions/deactivate-development-template-action"

type DeactivateDevelopmentTemplateButtonProps = {
  templateId: string
}

export function DeactivateDevelopmentTemplateButton({
  templateId,
}: DeactivateDevelopmentTemplateButtonProps) {
  return (
    <CrudArchiveButton
      title="Desativar template?"
      description="O template deixará de aparecer nas listagens padrão e não poderá ser utilizado na criação de novos planos."
      idleLabel="Desativar"
      pendingLabel="Desativando..."
      confirmLabel="Desativar"
      onArchive={async () => {
        const result =
          await deactivateDevelopmentTemplateAction(
            templateId
          )

        if (!result.success) {
          toast.error(result.message)
          return
        }

        toast.success(result.message)
      }}
    />
  )
}
