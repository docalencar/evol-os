"use client"

import type { ReactElement } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type ConfirmDialogProps = {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  children: ReactElement
  onConfirm: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
  children,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={children} />

      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-lg p-6">
        <AlertDialogHeader className="space-y-3 text-left">
          <AlertDialogTitle className="text-lg font-semibold leading-6">
            {title}
          </AlertDialogTitle>

          <AlertDialogDescription className="whitespace-normal break-words text-sm leading-6">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="mt-6 gap-2">
          <AlertDialogCancel disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              onConfirm()
            }}
            disabled={loading}
          >
            {loading ? "Processando..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}