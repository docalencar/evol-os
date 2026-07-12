"use client"

import { useState } from "react"
import type { ReactElement, ReactNode } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"

type CrudDialogControls = {
  close: () => void
}

type CrudEditDialogProps = {
  trigger: ReactElement
  title: string
  description?: string
  children:
    | ReactNode
    | ((controls: CrudDialogControls) => ReactNode)
}

export function CrudEditDialog({
  trigger,
  title,
  description,
  children,
}: CrudEditDialogProps) {
  const [open, setOpen] = useState(false)

  function close() {
    setOpen(false)
  }

  return (
    <EntityDialog
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      title={title}
      description={description}
    >
      {typeof children === "function"
        ? children({ close })
        : children}
    </EntityDialog>
  )
}
