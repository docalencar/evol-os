"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { DepartmentForm } from "./department-form"

type DepartmentCreateDialogProps = {
  companyId: string
}

export function DepartmentCreateDialog({
  companyId,
}: DepartmentCreateDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button>Novo Departamento</Button>}
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo departamento</DialogTitle>

          <DialogDescription>
            Cadastre uma área da organização.
          </DialogDescription>
        </DialogHeader>

        <DepartmentForm
          companyId={companyId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}