export type PeopleOrganizationMutationErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "TENANT_AUTHORIZATION_DENIED"
  | "PERSON_NOT_FOUND"
  | "ORGANIZATION_ENTITY_NOT_FOUND"
  | "TENANT_REFERENCE_INVALID"
  | "PERSON_ACCESS_CONFLICT"
  | "ORGANIZATION_HIERARCHY_CYCLE"
  | "VALIDATION_FAILED"
  | "CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "UNKNOWN"

const PUBLIC_MESSAGES: Record<
  PeopleOrganizationMutationErrorCode,
  string
> = {
  AUTHENTICATION_REQUIRED:
    "Sua sessão expirou. Entre novamente para continuar.",
  TENANT_AUTHORIZATION_DENIED:
    "Você não tem permissão para realizar esta ação.",
  PERSON_NOT_FOUND: "Colaborador não encontrado.",
  ORGANIZATION_ENTITY_NOT_FOUND: "Registro não encontrado.",
  TENANT_REFERENCE_INVALID:
    "Uma das referências selecionadas é inválida.",
  PERSON_ACCESS_CONFLICT:
    "Não é possível concluir: isso removeria o acesso de um responsável obrigatório da empresa.",
  ORGANIZATION_HIERARCHY_CYCLE:
    "Essa alteração criaria um ciclo na hierarquia da organização.",
  VALIDATION_FAILED:
    "Verifique os dados informados e tente novamente.",
  CONFLICT:
    "Este registro foi alterado por outra operação. Recarregue e tente novamente.",
  IDEMPOTENCY_CONFLICT:
    "Uma solicitação diferente com a mesma referência já foi processada.",
  UNKNOWN:
    "Não foi possível concluir a operação. Tente novamente.",
}

// Ordered longest-first so that specific codes win over shorter substrings
// (e.g. PERSON_ACCESS_CONFLICT / IDEMPOTENCY_CONFLICT before CONFLICT).
const KNOWN_CODES: PeopleOrganizationMutationErrorCode[] = [
  "ORGANIZATION_ENTITY_NOT_FOUND",
  "ORGANIZATION_HIERARCHY_CYCLE",
  "PERSON_ACCESS_CONFLICT",
  "TENANT_AUTHORIZATION_DENIED",
  "IDEMPOTENCY_CONFLICT",
  "TENANT_REFERENCE_INVALID",
  "AUTHENTICATION_REQUIRED",
  "VALIDATION_FAILED",
  "PERSON_NOT_FOUND",
  "CONFLICT",
]

export function toMutationErrorCode(
  rawMessage: string | null | undefined
): PeopleOrganizationMutationErrorCode {
  if (!rawMessage) {
    return "UNKNOWN"
  }

  for (const code of KNOWN_CODES) {
    if (rawMessage.includes(code)) {
      return code
    }
  }

  return "UNKNOWN"
}

export function publicMutationMessage(
  code: PeopleOrganizationMutationErrorCode
): string {
  return PUBLIC_MESSAGES[code]
}

export class PeopleOrganizationMutationError extends Error {
  readonly code: PeopleOrganizationMutationErrorCode

  constructor(code: PeopleOrganizationMutationErrorCode) {
    super(PUBLIC_MESSAGES[code])
    this.name = "PeopleOrganizationMutationError"
    this.code = code
  }
}
