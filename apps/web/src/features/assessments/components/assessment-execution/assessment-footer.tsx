"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { submitAssessmentResponseAction } from "../../actions/submit-assessment-response-action"
import { SubmitAssessmentDialog } from "./submit-assessment-dialog"

type AssessmentFooterProps = {
  companyId: string
  assessmentResponseId: string
  answered: number
  total: number
  canSubmit: boolean
  missingRequired: number
}

function scrollToSection(direction: "next" | "previous") {
  const sections = Array.from(
    document.querySelectorAll<HTMLElement>("[id^='section-']")
  )

  if (sections.length === 0) return

  const currentIndex = sections.findIndex((section) => {
    const rect = section.getBoundingClientRect()
    return rect.top >= 0 && rect.top < window.innerHeight / 2
  })

  const targetIndex =
    direction === "next"
      ? Math.min(sections.length - 1, currentIndex + 1)
      : Math.max(0, currentIndex - 1)

  sections[targetIndex]?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  })
}

export function AssessmentFooter({
  companyId,
  assessmentResponseId,
  answered,
  total,
  canSubmit,
  missingRequired,
}: AssessmentFooterProps) {
  const router = useRouter()

  const [loading, startTransition] =
    useTransition()

  const handleSubmit = () => {
    startTransition(async () => {
      const result =
        await submitAssessmentResponseAction(
          companyId,
          assessmentResponseId
        )

      if (!result.success) {
        toast.error(result.message)
        return
      }

      toast.success(result.message)

      router.refresh()
    })
  }

  return (
    <footer className="sticky bottom-0 z-20 mt-8 border-t bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between gap-6 px-6 py-4">

        <div>
          <p className="text-sm font-medium">
            {answered} de {total} perguntas respondidas
          </p>

          {canSubmit ? (
            <p className="text-xs text-emerald-600">
              ✔ Todas as perguntas obrigatórias foram respondidas.
            </p>
          ) : (
            <p className="text-xs text-amber-600">
              Faltam {missingRequired} pergunta(s) obrigatória(s).
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">

          <button
            type="button"
            onClick={() => scrollToSection("previous")}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            ← Anterior
          </button>

          <button
            type="button"
            onClick={() => scrollToSection("next")}
            className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
          >
            Próxima →
          </button>

          <SubmitAssessmentDialog
            disabled={!canSubmit}
            loading={loading}
            onConfirm={handleSubmit}
          />

        </div>

      </div>
    </footer>
  )
}
