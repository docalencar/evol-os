"use client"

import type {
  ReactElement,
  ReactNode,
} from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/utils/cn"

type EntityDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: ReactElement
  title: string
  description?: string
  children: ReactNode
  contentClassName?: string
  bodyClassName?: string
}

export function EntityDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  contentClassName,
  bodyClassName,
}: EntityDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogTrigger render={trigger} />

      <DialogContent
        className={cn(
          "flex max-h-[92dvh] w-[calc(100vw-1rem)] flex-col overflow-hidden p-0 sm:w-[calc(100vw-2rem)]",
          contentClassName
        )}
      >
        <div className="shrink-0 border-b px-5 py-4 sm:px-6">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>

            {description ? (
              <DialogDescription>
                {description}
              </DialogDescription>
            ) : null}
          </DialogHeader>
        </div>

        <div
          className={cn(
            "min-h-0 flex-1 overflow-hidden px-5 pb-5 pt-4 sm:px-6 sm:pb-6",
            bodyClassName
          )}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
