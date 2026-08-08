const MESSAGES: Readonly<Record<string, string>> = {
  IDEMPOTENCY_FINGERPRINT_CONFLICT: "Esta confirmação foi alterada. Revise os dados e confirme novamente.",
  DEVELOPMENT_TEMPLATE_PERSISTENCE_PERMISSION_DENIED: "Você não tem permissão para aplicar este template.",
  DEVELOPMENT_TEMPLATE_MAPPING_REQUIRED: "Este template precisa de um mapeamento de competência antes da aplicação.",
  DEVELOPMENT_TEMPLATE_MAPPING_NOT_ACTIVE: "O mapeamento de competência deste template não está ativo.",
  DEVELOPMENT_TEMPLATE_VERSION_NOT_CONSUMABLE: "Este template não está disponível para aplicação.",
  DEVELOPMENT_TEMPLATE_PERSISTENCE_FAILED: "Não foi possível concluir a aplicação. Tente novamente.",
  authorization_failure: "Você não tem permissão para aplicar este template.",
  integrity_failure: "Os dados do template mudaram. Verifique novamente antes de confirmar.",
  persistence_failure: "Não foi possível concluir a aplicação. Tente novamente.",
  resolution_failure: "Este template não está pronto para aplicação.",
}

export function developmentTemplateApplicationMessage(code: string): string {
  return MESSAGES[code] ?? "Não foi possível aplicar este template de desenvolvimento."
}
