import type { IssueCompanyMemberInvitationResult } from "@/features/tenant-access/actions"

// TEMPORARY — Phase 6 smoke. Client-facing state for the dev issue trigger.
export type SmokeIssueState = Readonly<{
  status: "idle" | "sent" | "error"
  message: string | null
}>

// Maps the real Issue Action result to safe copy. Never surfaces RPC codes,
// SQLSTATE, invitation id, correlation id, token, URL, digest or provider data.
// The captured link is revealed ONLY on the separate /app/dev/invitation-capture
// page — never here.
export function describeSmokeIssueResult(
  result: IssueCompanyMemberInvitationResult,
): SmokeIssueState {
  switch (result.status) {
    case "invitation_sent":
      return { status: "sent", message: "Convite emitido e capturado para o smoke." }
    case "conflict": {
      if (result.reason === "already_linked") {
        return { status: "error", message: "Esta pessoa já possui acesso." }
      }
      if (result.reason === "pending_invitation") {
        return { status: "error", message: "Já existe um convite pendente para esta pessoa." }
      }
      return { status: "error", message: "O convite não pôde ser criado no estado atual." }
    }
    case "denied":
      return { status: "error", message: "Sem permissão para emitir o convite." }
    case "invalid_input":
      return { status: "error", message: "Estado inválido para emissão." }
    case "session_expired":
      return { status: "error", message: "Sessão expirada. Entre novamente." }
    case "no_membership":
      return { status: "error", message: "Sem vínculo ativo com uma empresa." }
    case "tenant_selection_required":
      return { status: "error", message: "Selecione uma empresa antes de continuar." }
    case "invitation_created_delivery_failed":
    case "invitation_created_delivery_unknown":
    case "configuration_error":
      return { status: "error", message: "Convite criado, mas o transporte de entrega falhou." }
    case "failed":
    default:
      return { status: "error", message: "Não foi possível emitir o convite." }
  }
}
