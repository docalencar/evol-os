"use client"

import { useRouter } from "next/navigation"
import { useActionState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  presentAcceptanceResult,
  type AcceptInvitationFormState,
} from "../presentation/present-invitation-acceptance-result"

const INITIAL_STATE: AcceptInvitationFormState = { status: "idle" }

// Fixed internal destination after a successful acceptance. The server-side
// tenant resolver derives the company from the newly-created active membership;
// the browser never chooses a tenant and carries no secret or identifier here.
const POST_ACCEPT_DESTINATION = "/app"

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
  const router = useRouter()
  const [state, formAction, pending] = useActionState(acceptAction, INITIAL_STATE)
  const view = presentAcceptanceResult(state)

  if (state.status === "invitation_accepted") {
    // Human-triggered navigation only. router.refresh() invalidates any stale
    // client Router Cache for /app (e.g. a page previously fetched before this
    // membership existed) so the resolver sees the new active membership.
    const handleContinue = () => {
      router.refresh()
      router.push(POST_ACCEPT_DESTINATION)
    }

    return (
      <div className="space-y-3" role="status">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-emerald-700">{view.heading}</h2>
          <p className="text-sm text-slate-600">{view.body}</p>
        </div>
        <button
          type="button"
          onClick={handleContinue}
          className={cn(buttonVariants({ variant: "default" }))}
        >
          Continuar para o Evol OS
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
        <div role="alert" className="space-y-1">
          <p className="text-sm font-medium text-slate-900">{view.heading}</p>
          <p className="text-sm text-slate-600">{view.body}</p>
        </div>
      ) : null}
    </form>
  )
}
