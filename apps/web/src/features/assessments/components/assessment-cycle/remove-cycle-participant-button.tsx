"use client"

import { useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { removeCycleParticipantAction } from "../../actions/remove-cycle-participant-action"

type Props = {
  companyId: string
  assessmentCycleId: string
  employeeId: string
  disabled?: boolean
}

export function RemoveCycleParticipantButton({
  companyId,
  assessmentCycleId,
  employeeId,
  disabled = false,
}: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled || isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await removeCycleParticipantAction({
            companyId,
            assessmentCycleId,
            employeeId,
          })
          if (result.success) toast.success(result.message)
          else toast.error(result.message)
        })
      }
    >
      {isPending ? "Removendo..." : "Remover"}
    </Button>
  )
}
