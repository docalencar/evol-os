"use client"

import { X } from "lucide-react"
import { Dialog as BaseDialog } from "@base-ui/react/dialog"

import { cn } from "@/utils/cn"

export const Dialog = BaseDialog.Root
export const DialogTrigger = BaseDialog.Trigger
export const DialogClose = BaseDialog.Close

export function DialogContent({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className="fixed inset-0 z-50 bg-slate-950/40" />

      <BaseDialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <BaseDialog.Popup
          className={cn(
            "relative w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl",
            className
          )}
        >
          {children}

          <BaseDialog.Close className="absolute right-4 top-4 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
            <X className="h-4 w-4" />
          </BaseDialog.Close>
        </BaseDialog.Popup>
      </BaseDialog.Viewport>
    </BaseDialog.Portal>
  )
}

export function DialogHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 space-y-1">{children}</div>
}

export function DialogTitle({ children }: { children: React.ReactNode }) {
  return (
    <BaseDialog.Title className="text-lg font-semibold text-slate-900">
      {children}
    </BaseDialog.Title>
  )
}

export function DialogDescription({ children }: { children: React.ReactNode }) {
  return (
    <BaseDialog.Description className="text-sm text-slate-600">
      {children}
    </BaseDialog.Description>
  )
}

export function DialogFooter({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>
}
