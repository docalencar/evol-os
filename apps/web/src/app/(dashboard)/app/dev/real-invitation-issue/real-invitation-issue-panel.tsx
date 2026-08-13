"use client"

import { useActionState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import {
  emitRealSmokeInvitationAction,
} from "./actions"
import type { SmokeIssueState } from "./real-invitation-issue-result"

const INITIAL_STATE: SmokeIssueState = { status: "idle", message: null }

// TEMPORARY — Phase 6 smoke. Emission happens ONLY on an explicit human submit
// (no effect/auto-run). The invitation link is never shown here — it is revealed
// only on the separate /app/dev/invitation-capture page.
export function RealInvitationIssuePanel({ eligible }: { eligible: boolean }) {
  const [state, action, pending] = useActionState(
    emitRealSmokeInvitationAction,
    INITIAL_STATE,
  )

  return (
    <form action={action} className="space-y-3">
      <button
        type="submit"
        disabled={pending || !eligible || state.status === "sent"}
        className={cn(buttonVariants({ variant: "default" }))}
      >
        {pending ? "Emitindo…" : "Emitir convite real de smoke"}
      </button>

      {state.message ? (
        <p role="status" className="text-sm text-slate-700">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
