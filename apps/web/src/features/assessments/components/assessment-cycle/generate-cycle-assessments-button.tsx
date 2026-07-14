"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"

import { generateCycleAssessmentsAction } from "../../actions/generate-cycle-assessments-action"

type GenerateCycleAssessmentsButtonProps = {
  companyId: string
  assessmentCycleId: string
  assessmentTemplateId: string | null
  disabled?: boolean
}

export function GenerateCycleAssessmentsButton({
  companyId,
  assessmentCycleId,
  assessmentTemplateId,
  disabled = false,
}: GenerateCycleAssessmentsButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleGenerate() {
    if (!assessmentTemplateId) {
      toast.error(
        "Selecione um template antes de gerar as avaliações."
      )
      return
    }

    startTransition(async () => {
      const result = await generateCycleAssessmentsAction({
        companyId,
        assessmentCycleId,
        assessmentTemplateId,
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
        isPending ||
        !assessmentTemplateId
      }
    >
      {isPending
        ? "Gerando..."
        : "Gerar avaliações"}
    </Button>
  )
}
