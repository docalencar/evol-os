"use client"

import {
  useTransition,
} from "react"
import {
  useRouter,
} from "next/navigation"
import {
  toast,
} from "sonner"

import {
  Button,
} from "@/components/ui/button"

import {
  createWorkspaceAction,
} from "../actions"

type PlanningWorkspaceCreateButtonProps = {
  className?: string
}

export function PlanningWorkspaceCreateButton({
  className,
}: PlanningWorkspaceCreateButtonProps) {
  const router = useRouter()

  const [
    isPending,
    startTransition,
  ] = useTransition()

  function handleCreateWorkspace() {
    startTransition(async () => {
      const result =
        await createWorkspaceAction()

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)
      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      className={className}
      disabled={isPending}
      onClick={handleCreateWorkspace}
    >
      {isPending
        ? "Iniciando planejamento..."
        : "Iniciar planejamento"}
    </Button>
  )
}
