"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { generateCycleAssessmentsAction } from "../../actions/generate-cycle-assessments-action"

type GenerateCycleAssessmentsButtonProps = {
  companyId: string
  assessmentCycleId: string
  disabled?: boolean
}

export function GenerateCycleAssessmentsButton({
  companyId,
  assessmentCycleId,
  disabled = false,
}: GenerateCycleAssessmentsButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateCycleAssessmentsAction({
        companyId,
        assessmentCycleId,
      })

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
      onClick={handleGenerate}
      disabled={
        disabled ||
        isPending
      }
    >
      {isPending
        ? "Gerando..."
        : "Gerar avaliações"}
    </Button>
  )
}
