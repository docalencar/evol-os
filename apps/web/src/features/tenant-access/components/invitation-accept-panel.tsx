"use client"

import { useActionState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  presentAcceptanceResult,
  type AcceptInvitationFormState,
} from "../presentation/present-invitation-acceptance-result"

const INITIAL_STATE: AcceptInvitationFormState = { status: "idle" }

// Interactive acceptance. Receives ONLY the server-bound action reference; it
// has no access to any invitation secret or tenant authority. Acceptance runs
// solely on an explicit human submit (no effect/auto-run). The button is
// disabled while the submission is pending and after a successful acceptance.
// There is no automatic navigation on success (deferred to PR 6C-3).
export function InvitationAcceptPanel({
  acceptAction,
}: {
  acceptAction: (
    previousState: AcceptInvitationFormState,
    formData: FormData,
  ) => Promise<AcceptInvitationFormState>
}) {
  const [state, formAction, pending] = useActionState(acceptAction, INITIAL_STATE)
  const view = presentAcceptanceResult(state)

  if (state.status === "invitation_accepted") {
    return (
      <div className="space-y-3" role="status">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-emerald-700">{view.heading}</h2>
          <p className="text-sm text-slate-600">{view.body}</p>
        </div>
        <button
          type="button"
          disabled
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Continuar
        </button>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ variant: "default" }))}
      >
        {pending ? "Aceitando..." : "Aceitar convite"}
      </button>

      {view.tone === "error" ? (
        <div role="status" className="space-y-1">
          <p className="text-sm font-medium text-slate-900">{view.heading}</p>
          <p className="text-sm text-slate-600">{view.body}</p>
        </div>
      ) : null}
    </form>
  )
}
