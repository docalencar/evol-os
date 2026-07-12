"use client"

import { Button } from "@/components/ui/button"

import { CrudCreateDialog } from "@/components/shared/crud/crud-create-dialog"

import { DevelopmentTemplateForm } from "./development-template-form"

export function CreateDevelopmentTemplateDialog() {
  return (
    <CrudCreateDialog
      trigger={<Button>Novo Template</Button>}
      title="Novo template"
      description="Crie um template reutilizável para acelerar a elaboração de planos de desenvolvimento."
    >
      {({ close }) => (
        <DevelopmentTemplateForm
          onSuccess={close}
        />
      )}
    </CrudCreateDialog>
  )
}
