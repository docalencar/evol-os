import type { AcceptCompanyMemberInvitationResult } from "../orchestration/accept-company-member-invitation"

// Client-facing acceptance state: the Action result plus an initial idle state.
export type AcceptInvitationFormState =
  | AcceptCompanyMemberInvitationResult
  | Readonly<{ status: "idle" }>

export type AcceptanceView = Readonly<{
  tone: "idle" | "success" | "error"
  heading: string
  body: string
}>

// Maps the acceptance state to safe, user-facing copy. Never surfaces internal
// codes, UUIDs, tokens, digests, emails, roles or provider/database details.
export function presentAcceptanceResult(
  state: AcceptInvitationFormState,
): AcceptanceView {
  switch (state.status) {
    case "idle":
      return { tone: "idle", heading: "", body: "" }
    case "invitation_accepted":
      return {
        tone: "success",
        heading: "Convite aceito com sucesso.",
        body: "Seu acesso foi ativado.",
      }
    case "conflict": {
      if (state.reason === "already_member") {
        return { tone: "error", heading: "Acesso já ativo", body: "Sua conta já possui acesso a esta empresa." }
      }
      if (state.reason === "already_accepted") {
        return { tone: "error", heading: "Convite já utilizado", body: "Este convite já foi utilizado." }
      }
      // person_linked_other and any other conflict stay neutral.
      return {
        tone: "error",
        heading: "Não foi possível aceitar",
        body: "Não foi possível aceitar este convite com a conta atual.",
      }
    }
    case "denied":
      return {
        tone: "error",
        heading: "Não foi possível aceitar",
        body: "Não foi possível aceitar este convite com a conta atual.",
      }
    case "expired":
      return { tone: "error", heading: "Convite expirado", body: "Este convite expirou." }
    case "revoked":
      return { tone: "error", heading: "Convite indisponível", body: "Este convite não está mais disponível." }
    case "not_found":
      return { tone: "error", heading: "Convite inválido", body: "Este convite não é válido." }
    case "session_expired":
      return {
        tone: "error",
        heading: "Sessão expirada",
        body: "Sua sessão expirou. Entre novamente e reabra o link original do convite.",
      }
    case "invalid_input":
      return { tone: "error", heading: "Convite inválido", body: "Este convite não é válido." }
    case "failed":
    default:
      return {
        tone: "error",
        heading: "Não foi possível continuar",
        body: "Não foi possível concluir o aceite. Tente novamente.",
      }
  }
}
