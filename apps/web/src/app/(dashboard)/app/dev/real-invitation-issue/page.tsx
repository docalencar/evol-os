import { notFound } from "next/navigation"

import { Card } from "@/components/ui/card"

import { findSmokeTargetPerson, SMOKE_TARGET_EMAIL } from "./find-smoke-target-person"
import { RealInvitationIssuePanel } from "./real-invitation-issue-panel"

// TEMPORARY — MVP-PR1 Phase 6 real acceptance smoke ONLY.
// Dev-only, owner-gated page that lets an owner/admin emit the REAL invitation
// for the prepared smoke People. Guarded by the SAME double gate as the capture
// bridge plus an owner/admin session check. Does NOT create People and does NOT
// reveal the invitation link (that lives on /app/dev/invitation-capture).
export default async function RealInvitationIssuePage() {
  const captureGateOpen =
    process.env.NODE_ENV === "development" &&
    process.env.DEV_INVITATION_CAPTURE_ENABLED === "true"

  if (!captureGateOpen) {
    notFound()
  }

  const target = await findSmokeTargetPerson()
  if (target.status === "unauthorized") {
    notFound()
  }

  const eligible = target.status === "eligible"

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Emissão de convite (dev)
        </h1>
        <p className="text-sm text-slate-600">
          Dispara a Issue Action real para a People de smoke preparada. O link é
          revelado apenas em <code>/app/dev/invitation-capture</code>.
        </p>
      </div>

      <Card className="space-y-3">
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Target</dt>
            <dd className="text-slate-900">{SMOKE_TARGET_EMAIL}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Papel</dt>
            <dd className="text-slate-900">employee</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">People elegível</dt>
            <dd className="text-slate-900">{eligible ? "YES" : "NO"}</dd>
          </div>
        </dl>

        {eligible ? (
          <RealInvitationIssuePanel eligible />
        ) : (
          <p className="text-sm text-slate-600">
            {target.status === "ambiguous"
              ? "Estado ambíguo: mais de uma People candidata no tenant."
              : "People de smoke ainda não preparada. Crie-a pelo fluxo legítimo em /app/people (active, e-mail do smoke, sem usuário vinculado)."}
          </p>
        )}
      </Card>
    </div>
  )
}
