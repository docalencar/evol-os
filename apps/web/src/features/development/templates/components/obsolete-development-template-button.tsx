"use client"

import { toast } from "sonner"

import { CrudArchiveButton } from "@/components/shared/crud/crud-archive-button"

import { obsoleteDevelopmentTemplateAction } from "../actions/obsolete-development-template-action"

type ObsoleteDevelopmentTemplateButtonProps = {
  templateId: string
}

export function ObsoleteDevelopmentTemplateButton({
  templateId,
}: ObsoleteDevelopmentTemplateButtonProps) {
  return (
    <CrudArchiveButton
      title="Tornar template obsoleto?"
      description="O template deixará de aparecer nas listagens padrão e não poderá ser utilizado na criação de novos planos."
      idleLabel="Tornar obsoleto"
      pendingLabel="Desativando..."
      confirmLabel="Tornar obsoleto"
      onArchive={async () => {
        const result =
          await obsoleteDevelopmentTemplateAction(
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
