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

type DepartmentEditDialogProps = {
  companyId: string
  department: {
    id: string
    name: string
    description: string | null
  }
}

export function DepartmentEditDialog({
  companyId,
  department,
}: DepartmentEditDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="secondary" size="sm">
            Editar
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar departamento</DialogTitle>

          <DialogDescription>
            Atualize as informações desta área da organização.
          </DialogDescription>
        </DialogHeader>

        <DepartmentForm
          companyId={companyId}
          department={department}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
