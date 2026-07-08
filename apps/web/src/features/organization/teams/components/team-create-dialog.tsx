"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { TeamForm } from "./team-form"

type TeamCreateDialogProps = {
  companyId: string
}

export function TeamCreateDialog({ companyId }: TeamCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button>Novo time</Button>}
      title="Novo time"
      description="Cadastre um time da organização."
    >
      <TeamForm companyId={companyId} onSuccess={() => setOpen(false)} />
    </EntityDialog>
  )
}
