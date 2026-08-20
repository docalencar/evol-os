"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { SeniorityLevelForm } from "./seniority-level-form"

type SeniorityLevelCreateDialogProps = {
  companyId: string
}

export function SeniorityLevelCreateDialog({
  companyId,
}: SeniorityLevelCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Nova senioridade</Button>}
      title="Nova senioridade"
      description="Cadastre um nível de senioridade da empresa."
    >
      <SeniorityLevelForm
        companyId={companyId}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
