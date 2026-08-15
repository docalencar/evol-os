"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

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
import { Button } from "@/components/ui/button"

import {
  resendCompanyMemberInvitationAction,
  revokeCompanyMemberInvitationAction,
} from "../actions"

type Feedback = Readonly<{
  tone: "success" | "error"
  message: string
  stale?: boolean
}>

export function PeopleAccessActions({
  invitationId,
  expectedGeneration,
  canResend,
  canRevoke,
}: {
  invitationId: string
  expectedGeneration: number
  canResend: boolean
  canRevoke: boolean
}) {
  const router = useRouter()
  const submissionInFlight = useRef(false)
  const feedbackRef = useRef<HTMLParagraphElement>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (feedback) feedbackRef.current?.focus()
  }, [feedback])

  function redirectFor(status: string) {
    if (status === "session_expired") router.replace("/login")
    if (status === "tenant_selection_required") router.replace("/select-company")
    if (status === "no_membership") router.replace("/onboarding")
    return ["session_expired", "tenant_selection_required", "no_membership"].includes(status)
  }

  function begin(operation: "resend" | "revoke") {
    if (submissionInFlight.current) return
    submissionInFlight.current = true
    setFeedback(null)

    startTransition(async () => {
      try {
        const input = { invitationId, expectedGeneration }
        const actionResult = operation === "resend"
          ? await resendCompanyMemberInvitationAction(input)
          : await revokeCompanyMemberInvitationAction(input)

        if (redirectFor(actionResult.status)) return

        if (actionResult.status === "invitation_sent" || actionResult.status === "invitation_revoked") {
          setFeedback({ tone: "success", message: operation === "resend" ? "Convite reenviado." : "Convite revogado." })
          router.refresh()
          return
        }

        if (actionResult.status === "invitation_updated_delivery_failed" ||
          actionResult.status === "invitation_updated_delivery_unknown" ||
          actionResult.status === "configuration_error") {
          setFeedback({
            tone: "error",
            message: "O convite foi atualizado, mas o envio do e-mail não pôde ser confirmado.",
          })
          router.refresh()
          return
        }

        if (actionResult.status === "conflict" && actionResult.reason === "stale_generation") {
          setFeedback({
            tone: "error",
            stale: true,
            message: "O convite foi alterado por outra operação. Atualize a página e tente novamente.",
          })
          return
        }

        setFeedback({
          tone: "error",
          message: "message" in actionResult ? actionResult.message : "Não foi possível concluir a operação.",
        })
      } catch {
        setFeedback({ tone: "error", message: "Não foi possível concluir a operação." })
      } finally {
        submissionInFlight.current = false
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canResend ? (
        <Button type="button" size="sm" variant="secondary" disabled={isPending} onClick={() => begin("resend")}>
          {isPending ? "Processando..." : "Reenviar convite"}
        </Button>
      ) : null}

      {canRevoke ? (
        <AlertDialog>
          <AlertDialogTrigger render={<Button type="button" size="sm" variant="destructive" disabled={isPending} />}>
            Revogar convite
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revogar convite?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação invalida o convite atual. Um novo acesso exigirá outro convite.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" disabled={isPending} onClick={(event) => {
                event.preventDefault()
                begin("revoke")
              }}>
                {isPending ? "Revogando..." : "Confirmar revogação"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {feedback ? (
        <div className="flex items-center gap-2">
          <p ref={feedbackRef} tabIndex={-1} role={feedback.tone === "error" ? "alert" : "status"}
            className={feedback.tone === "error" ? "text-xs text-red-700" : "text-xs text-emerald-700"}>
            {feedback.message}
          </p>
          {feedback.stale ? <Button type="button" size="sm" variant="secondary" onClick={() => router.refresh()}>Atualizar</Button> : null}
        </div>
      ) : null}
    </div>
  )
}
