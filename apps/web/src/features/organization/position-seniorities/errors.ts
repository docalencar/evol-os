// Maps the stable reason codes raised by the 0102 boundaries to safe public copy.
export function publicPositionSeniorityMessage(
  error: { message?: string } | null | undefined,
  fallback: string
): string {
  const code = error?.message ?? ""
  if (code.includes("BASE_PROFILE_NOT_ARCHIVABLE")) {
    return "Este profile é a âncora do cargo e não pode ser removido."
  }
  if (code.includes("BASE_PROFILE_NOT_ADDABLE")) {
    return "Selecione uma senioridade válida."
  }
  if (code.includes("POSITION_SENIORITY_PROFILE_NOT_FOUND")) {
    return "Senioridade do cargo não encontrada ou indisponível."
  }
  if (code.includes("SENIORITY_LEVEL_NOT_FOUND")) {
    return "Senioridade não encontrada ou inativa no catálogo."
  }
  if (code.includes("POSITION_NOT_FOUND")) {
    return "Cargo não encontrado ou indisponível."
  }
  if (code.includes("CONFLICT")) {
    return "Esta senioridade já está aplicada a este cargo."
  }
  if (code.includes("TENANT_AUTHORIZATION_DENIED")) {
    return "Você não tem permissão para realizar esta ação."
  }
  if (code.includes("AUTHENTICATION_REQUIRED")) {
    return "Sua sessão expirou. Entre novamente para continuar."
  }
  return fallback
}
