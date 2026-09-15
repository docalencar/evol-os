"use client"

import { useRef, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MessageSquarePlus } from "lucide-react"
import { toast } from "sonner"

import { EntityDialog } from "@/components/shared/entity-dialog"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

import { createFeedbackConversationAction } from "../actions"
import type { AssessmentResponseFeedbackLink } from "../types/assessment-response-feedback-link"

type AssessmentResponseFeedbackStarterProps = {
  assessmentResponseId: string
  /**
   * What the server could prove about this response's formal thread. The three
   * states are rendered as three different surfaces — never as "no thread".
   */
  link: AssessmentResponseFeedbackLink
  /**
   * Whether this viewer may even be offered authorship. Deliberately coarse:
   * the page knows the response is finalized and that the viewer is its
   * evaluator, and that is all the browser is trusted to reason about. The
   * remaining conditions — the response's perspective, tenant membership,
   * person lifecycle — are decided by create_assessment_feedback_v1, which is
   * the authority whether or not this flag is true.
   */
  canInitiate: boolean
}

export function AssessmentResponseFeedbackStarter({
  assessmentResponseId,
  link,
  canInitiate,
}: AssessmentResponseFeedbackStarterProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [initialMessage, setInitialMessage] = useState("")
  const [isPending, startTransition] = useTransition()

  if (link.status === "existing_formal_feedback") {
    return (
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Feedback desta avaliação
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Esta avaliação já tem uma conversa de feedback aberta.
          </p>
        </div>

        <Link
          href={`/app/feedbacks/${link.threadId}`}
          className={buttonVariants()}
        >
          Abrir conversa de feedback
        </Link>
      </Card>
    )
  }

  // A lookup that failed proves nothing, so it offers nothing. Saying so is
  // better than a silent gap where an action used to be.
  if (link.status === "unavailable") {
    return (
      <Card className="p-5">
        <p className="text-sm text-slate-600">
          Não foi possível verificar o feedback desta avaliação. Recarregue a
          página em instantes.
        </p>
      </Card>
    )
  }

  if (!canInitiate) {
    return null
  }

  function handleSubmit(formData: FormData) {
    const message = String(formData.get("initialMessage") ?? "").trim()

    // Whitespace is not a message. The boundary rejects it too; this only keeps
    // the round trip from happening.
    if (!message) {
      toast.error("Escreva a mensagem inicial do feedback.")
      return
    }

    startTransition(async () => {
      const result = await createFeedbackConversationAction({
        assessmentResponseId,
        initialMessage: message,
      })

      if (!result.success) {
        toast.error(result.message)
        return
      }

      setInitialMessage("")
      formRef.current?.reset()
      setOpen(false)
      toast.success(result.message)

      // The mutation's own answer is a claim, not proof. Refreshing re-runs the
      // server component, which re-reads the canonical bridge and renders the
      // thread that is actually there — including the thread someone else
      // created between this page load and this click, which the Action reports
      // as `already_exists` rather than as a failure.
      router.refresh()
    })
  }

  return (
    <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-900">
          Feedback desta avaliação
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Registre o feedback formal a partir deste resultado.
        </p>
      </div>

      <EntityDialog
        open={open}
        onOpenChange={setOpen}
        dismissible={false}
        trigger={
          <Button>
            <MessageSquarePlus className="h-4 w-4" />
            Iniciar feedback
          </Button>
        }
        title="Iniciar feedback da avaliação"
        description="A primeira mensagem abre a conversa com a pessoa avaliada."
      >
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="assessment-feedback-initial-message"
              className="text-sm font-medium text-slate-900"
            >
              Mensagem inicial
            </label>

            <p className="mt-1 text-sm text-slate-500">
              Escreva um retorno objetivo e respeitoso sobre o resultado.
            </p>
          </div>

          <Textarea
            id="assessment-feedback-initial-message"
            name="initialMessage"
            value={initialMessage}
            onChange={(event) => setInitialMessage(event.target.value)}
            disabled={isPending}
            placeholder="Digite a mensagem inicial..."
            className="min-h-32"
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isPending || initialMessage.trim().length === 0}
            >
              {isPending ? "Criando..." : "Criar feedback"}
            </Button>
          </div>
        </form>
      </EntityDialog>
    </Card>
  )
}
