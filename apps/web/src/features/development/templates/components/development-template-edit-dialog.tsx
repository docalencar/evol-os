"use client"

import { Button } from "@/components/ui/button"

import { CrudEditDialog } from "@/components/shared/crud/crud-edit-dialog"

import type { DevelopmentTemplate } from "../types/development-template"

import { DevelopmentTemplateForm } from "./development-template-form"

type DevelopmentTemplateEditDialogProps = {
  template: DevelopmentTemplate
}

export function DevelopmentTemplateEditDialog({
  template,
}: DevelopmentTemplateEditDialogProps) {
  return (
    <CrudEditDialog
      trigger={
        <Button
          variant="secondary"
          size="sm"
        >
          Editar
        </Button>
      }
      title="Editar template"
      description="Atualize os dados do template."
    >
      {({ close }) => (
        <DevelopmentTemplateForm
          template={template}
          onSuccess={close}
        />
      )}
    </CrudEditDialog>
  )
}
