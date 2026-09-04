export function publicPositionSeniorityCompetencyMessage(
  error: { message?: string } | null | undefined,
  fallback: string
): string {
  const code = error?.message ?? ""

  if (code.includes("TENANT_AUTHORIZATION_DENIED")) {
    return "Você não tem permissão para alterar esta matriz."
  }
  if (code.includes("AUTHENTICATION_REQUIRED")) {
    return "Sua sessão expirou. Entre novamente para continuar."
  }
  if (code.includes("PROFILE_NOT_FOUND") || code.includes("PROFILE_ARCHIVED")) {
    return "Este perfil de senioridade não está mais disponível. Atualize a página."
  }
  if (code.includes("COMPETENCY_NOT_FOUND")) {
    return "Esta competência não está mais disponível. Atualize a página."
  }
  if (code.includes("CONFLICT") || code.includes("23505")) {
    return "A expectativa foi alterada por outra operação. Atualize a página e tente novamente."
  }
  if (code.includes("VALIDATION_FAILED")) {
    return "Revise os valores informados e tente novamente."
  }

  return fallback
}
