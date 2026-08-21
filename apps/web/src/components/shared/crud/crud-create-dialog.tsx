"use client"

import { useState } from "react"
import type { ReactElement, ReactNode } from "react"

import { EntityDialog } from "@/components/shared/entity-dialog"

type CrudDialogControls = {
  close: () => void
}

type CrudCreateDialogProps = {
  trigger: ReactElement
  title: string
  description?: string
  dismissible?: boolean
  children:
    | ReactNode
    | ((controls: CrudDialogControls) => ReactNode)
}

export function CrudCreateDialog({
  trigger,
  title,
  description,
  dismissible,
  children,
}: CrudCreateDialogProps) {
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
      dismissible={dismissible}
    >
      {typeof children === "function"
        ? children({ close })
        : children}
    </EntityDialog>
  )
}
