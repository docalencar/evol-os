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
  // When false, an outside click / Escape does not dismiss the dialog — used for
  // create/edit forms so entered data is never lost by an accidental click. The
  // explicit close (X) and the form's own Cancel button still close it.
  dismissible?: boolean
}

type OpenChangeDetails = {
  reason?: string
  cancel: () => void
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
  dismissible = true,
}: EntityDialogProps) {
  function handleOpenChange(
    nextOpen: boolean,
    details: OpenChangeDetails
  ) {
    // For non-dismissible (create/edit) dialogs, ignore accidental closes from
    // an outside click or Escape so entered data is never lost. Explicit closes
    // (the X button, the form's Cancel, a successful submit) still pass through.
    if (
      !dismissible &&
      !nextOpen &&
      (details.reason === "outside-press" ||
        details.reason === "escape-key")
    ) {
      details.cancel()
      return
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
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
            // Bounded flex column. The single child (a form/wizard) is forced to
            // be a filling flex column so height propagates via flex (not a
            // fragile percentage): the content region scrolls internally and the
            // footer/actions stay reachable without zooming out. Short forms
            // simply size to content since the dialog height is only a cap.
            "flex min-h-0 flex-1 flex-col overflow-hidden px-5 pb-5 pt-4 sm:px-6 sm:pb-6 [&>*]:flex [&>*]:min-h-0 [&>*]:flex-1 [&>*]:flex-col",
            bodyClassName
          )}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  )
}
