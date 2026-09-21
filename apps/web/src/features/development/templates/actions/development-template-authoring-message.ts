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
  DEVELOPMENT_TEMPLATE_CONTENT_INCOMPLETE:
    "Para publicar, o rascunho precisa de pelo menos uma competência e uma ação em cada competência.",
  // The boundary's own named refusals. "Not found" and "forbidden" deliberately
  // read the same to the user: whether a template exists is not something an
  // unauthorized actor should be able to infer from the wording.
  DEVELOPMENT_TEMPLATE_FORBIDDEN: "Este template não está disponível para você.",
  DEVELOPMENT_TEMPLATE_NOT_FOUND: "Este template não está disponível para você.",
  DEVELOPMENT_TEMPLATE_GOAL_NOT_FOUND: "Esta competência não está disponível para você.",
  DEVELOPMENT_TEMPLATE_INVALID: "Revise os dados do template antes de continuar.",
  DEVELOPMENT_TEMPLATE_GOAL_INVALID: "Revise os dados da competência antes de continuar.",
  DEVELOPMENT_TEMPLATE_ACTION_INVALID: "Revise os dados da ação antes de continuar.",
  DEVELOPMENT_TEMPLATE_IMMUTABLE:
    "Esta versão já foi publicada e não pode ser alterada. Crie um novo rascunho.",
  DEVELOPMENT_TEMPLATE_TRANSITION_INVALID:
    "O estado atual desta versão não permite esta operação.",
  DEVELOPMENT_TEMPLATE_IDEMPOTENCY_CONFLICT:
    "Já existe um template criado com estes dados.",
  DEVELOPMENT_TEMPLATE_OPERATION_FAILED:
    "Não foi possível concluir a operação no template.",
}

export function developmentTemplateAuthoringMessage(
  error: unknown,
  fallback: string
): string {
  if (!(error instanceof Error)) return fallback
  const known = MESSAGES[error.message as DevelopmentTemplateAuthoringErrorCode]
  return known ?? fallback
}
