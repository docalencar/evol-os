import {
  TrustedFeedbackMutationError,
  type TrustedFeedbackMutationErrorCode,
} from "../repositories/trusted-feedback-mutation-repository"

/**
 * One translation table for all five Actions, so the user-facing wording cannot
 * drift into an oracle in one of them.
 *
 * `unavailable` has a single message on purpose. A response or thread that
 * belongs to another tenant, one the caller may not touch, one that is
 * ineligible and one that does not exist all arrive here as the same code and
 * all leave with the same sentence — the caller learns that they cannot act,
 * never whether the row exists.
 */
const MESSAGES: Readonly<Record<TrustedFeedbackMutationErrorCode, string>> = {
  authentication_required: "Sua sessão expirou. Entre novamente para continuar.",
  unavailable: "Esta conversa de feedback não está disponível.",
  invalid_content: "A mensagem precisa ter entre 1 e 10000 caracteres.",
  invalid_transition: "O estado atual da conversa não permite esta ação.",
  unknown: "Não foi possível concluir a operação de feedback.",
}

export function feedbackMutationErrorMessage(error: unknown, fallback: string): string {
  return error instanceof TrustedFeedbackMutationError ? MESSAGES[error.code] : fallback
}
