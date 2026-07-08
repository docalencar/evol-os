"use client"

import { useState } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button } from "@/components/ui/button"

import { TeamForm } from "./team-form"

type TeamEditDialogProps = {
  companyId: string
  team: {
    id: string
    name: string
    description: string | null
  }
}

export function TeamEditDialog({ companyId, team }: TeamEditDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="secondary" size="sm">
          Editar
        </Button>
      }
      title="Editar time"
      description="Atualize as informações deste time."
    >
      <TeamForm
        companyId={companyId}
        team={team}
        onSuccess={() => setOpen(false)}
      />
    </EntityDialog>
  )
}
