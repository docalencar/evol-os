import { notFound } from "next/navigation"

import { Card } from "@/components/ui/card"
import { getCurrentCompanyContext } from "@/lib/supabase/supabase/current-company"

import { RevealCapturePanel } from "./reveal-capture-panel"

// TEMPORARY — MVP-PR1 Phase 6 real acceptance smoke ONLY.
// Owner-gated, dev-only page to reveal the captured invitation link. Guarded by
// the SAME double gate as the transport (development + explicit flag) plus an
// owner/admin session check. Remove after the smoke (see the delivery/dev/README).
export default async function InvitationCapturePage() {
  const captureGateOpen =
    process.env.NODE_ENV === "development" &&
    process.env.DEV_INVITATION_CAPTURE_ENABLED === "true"

  if (!captureGateOpen) {
    notFound()
  }

  const { currentUser } = await getCurrentCompanyContext()
  if (currentUser.role !== "owner" && currentUser.role !== "admin") {
    notFound()
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">
          Captura de convite (dev)
        </h1>
        <p className="text-sm text-slate-600">
          Transporte local de desenvolvimento (mailcatcher). Ativo apenas sob o
          gate duplo. Não é uma resposta administrativa de produção.
        </p>
      </div>

      <Card>
        <RevealCapturePanel />
      </Card>
    </div>
  )
}
