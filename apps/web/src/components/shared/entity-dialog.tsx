"use client"

import { ReactNode } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type EntityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactElement
  title: string
  description?: string
  children: ReactNode
}

export function EntityDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
}: EntityDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>

          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {children}
      </DialogContent>
    </Dialog>
  )
}
