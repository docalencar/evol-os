// Maps the stable reason codes raised by the 0100 boundaries to safe public copy.
// Never expose SQLSTATE / raw PostgREST messages to the user.
export function publicSeniorityLevelMessage(
  error: { message?: string } | null | undefined,
  fallback: string
): string {
  const code = error?.message ?? ""
  if (code.includes("IDEMPOTENCY_CONFLICT")) {
    return "Uma solicitação diferente com a mesma referência já foi processada."
  }
  if (code.includes("CONFLICT")) {
    return "Já existe uma senioridade ativa com este código."
  }
  if (code.includes("VALIDATION_FAILED")) {
    return "Verifique os dados informados e tente novamente."
  }
  if (code.includes("SENIORITY_LEVEL_NOT_FOUND")) {
    return "Senioridade não encontrada ou indisponível."
  }
  if (code.includes("TENANT_AUTHORIZATION_DENIED")) {
    return "Você não tem permissão para realizar esta ação."
  }
  if (code.includes("AUTHENTICATION_REQUIRED")) {
    return "Sua sessão expirou. Entre novamente para continuar."
  }
  return fallback
}
