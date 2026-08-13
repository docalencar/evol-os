"use client"

import { useActionState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  revealCapturedInvitationAction,
  type RevealCaptureState,
} from "./actions"

const INITIAL_STATE: RevealCaptureState = { status: "idle", invitationUrl: null }

// TEMPORARY — Phase 6 smoke. The captured link is shown only after an explicit
// human "Revelar link capturado" submit; it is never rendered in the initial
// HTML, never logged, and never auto-fetched.
export function RevealCapturePanel() {
  const [state, action, pending] = useActionState(
    revealCapturedInvitationAction,
    INITIAL_STATE,
  )

  return (
    <form action={action} className="space-y-3">
      <button
        type="submit"
        disabled={pending}
        className={cn(buttonVariants({ variant: "default" }))}
      >
        {pending ? "Revelando…" : "Revelar link capturado"}
      </button>

      {state.status === "revealed" && state.invitationUrl ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-900">Link do convite (dev)</p>
          <code className="block break-all rounded bg-slate-100 p-2 text-xs text-slate-800">
            {state.invitationUrl}
          </code>
        </div>
      ) : null}

      {state.status === "empty" ? (
        <p className="text-sm text-slate-600">
          Nenhum link capturado disponível (emita um convite com a ponte ativa).
        </p>
      ) : null}
    </form>
  )
}
