export type PeopleOrganizationMutationErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "TENANT_AUTHORIZATION_DENIED"
  | "PERSON_NOT_FOUND"
  | "ORGANIZATION_ENTITY_NOT_FOUND"
  | "TENANT_REFERENCE_INVALID"
  | "PERSON_ACCESS_CONFLICT"
  | "ORGANIZATION_HIERARCHY_CYCLE"
  | "POSITION_SENIORITY_PROFILE_POSITION_MISMATCH"
  | "POSITION_SENIORITY_PROFILE_NOT_FOUND"
  | "POSITION_SENIORITY_PROFILE_ARCHIVED"
  | "POSITION_SENIORITY_PROFILE_INCOHERENT"
  | "SENIORITY_LEVEL_ARCHIVED"
  | "SENIORITY_LEVEL_NOT_FOUND"
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
  POSITION_SENIORITY_PROFILE_POSITION_MISMATCH:
    "A senioridade selecionada não pertence ao cargo escolhido.",
  POSITION_SENIORITY_PROFILE_NOT_FOUND:
    "A senioridade selecionada não foi encontrada para este cargo.",
  POSITION_SENIORITY_PROFILE_ARCHIVED:
    "A senioridade selecionada está arquivada e não pode ser atribuída.",
  POSITION_SENIORITY_PROFILE_INCOHERENT:
    "A combinação de cargo e senioridade é inválida.",
  SENIORITY_LEVEL_ARCHIVED:
    "Essa senioridade está arquivada e não pode ser atribuída.",
  SENIORITY_LEVEL_NOT_FOUND:
    "Uma das senioridades selecionadas é inválida ou não está mais disponível.",
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
  "POSITION_SENIORITY_PROFILE_POSITION_MISMATCH",
  "POSITION_SENIORITY_PROFILE_INCOHERENT",
  "POSITION_SENIORITY_PROFILE_NOT_FOUND",
  "POSITION_SENIORITY_PROFILE_ARCHIVED",
  "SENIORITY_LEVEL_ARCHIVED",
  "SENIORITY_LEVEL_NOT_FOUND",
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
