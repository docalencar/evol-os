import type { DevelopmentTemplateAuthoringErrorCode } from "../types/development-template-authoring"

/**
 * Turns the authoring boundary's named failures into copy, and everything else
 * into one fallback. Raw database text never reaches the client: a PostgreSQL
 * error message is an oracle, and the codes below are the only vocabulary the
 * server layer promises.
 */
const MESSAGES: Readonly<Record<DevelopmentTemplateAuthoringErrorCode, string>> = {
  DEVELOPMENT_TEMPLATE_NOT_AVAILABLE:
    "Este template não está disponível para edição.",
  DEVELOPMENT_TEMPLATE_VERSION_NOT_EDITABLE:
    "Esta versão já foi publicada e não pode ser alterada. Crie um novo rascunho.",
  DEVELOPMENT_TEMPLATE_GOAL_NOT_AVAILABLE:
    "Esta competência não pertence ao rascunho atual do template.",
  DEVELOPMENT_TEMPLATE_NO_PUBLISHED_VERSION:
    "Este template não tem uma versão publicada para tornar obsoleta.",
  DEVELOPMENT_TEMPLATE_DRAFT_NOT_READABLE:
    "O rascunho foi criado, mas não pôde ser lido de volta. Recarregue a página.",
}

export function developmentTemplateAuthoringMessage(
  error: unknown,
  fallback: string
): string {
  if (!(error instanceof Error)) return fallback
  const known = MESSAGES[error.message as DevelopmentTemplateAuthoringErrorCode]
  return known ?? fallback
}
