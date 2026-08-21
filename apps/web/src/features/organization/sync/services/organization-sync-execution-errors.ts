import {
  publicMutationMessage,
  toMutationErrorCode,
} from "@/features/people-organization-mutations/errors"

// Stable, execution-boundary error codes owned by
// apply_tenant_organization_sync_plan_v1 (0107). Everything else the RPC can
// surface (VALIDATION_FAILED, TENANT_REFERENCE_INVALID, IDEMPOTENCY_CONFLICT,
// POSITION_SENIORITY_PROFILE_*, SENIORITY_LEVEL_NOT_FOUND, …) is already covered
// by the shared people-organization mutation copy, which we delegate to so the
// PT-BR wording lives in exactly one place.
export type OrganizationSyncExecutionCode =
  | "SYNC_DEPENDENCY_NOT_FOUND"
  | "SYNC_UNSUPPORTED_OPERATION"
  | "SYNC_ITEM_FAILED"
  | "SYNC_EXECUTION_CONFLICT"

const SYNC_EXECUTION_MESSAGES: Record<
  OrganizationSyncExecutionCode,
  string
> = {
  SYNC_DEPENDENCY_NOT_FOUND:
    "Uma dependência do item (departamento, cargo, time ou gestor) não foi encontrada.",
  SYNC_UNSUPPORTED_OPERATION:
    "A operação solicitada para este item ainda não é suportada.",
  SYNC_ITEM_FAILED:
    "Não foi possível aplicar este item. Revise os dados e tente novamente.",
  SYNC_EXECUTION_CONFLICT:
    "Esta importação já foi enviada com um conteúdo diferente. Refaça a análise antes de aplicar.",
}

// Longest-first so specific codes win over shorter substrings.
const SYNC_EXECUTION_CODES: OrganizationSyncExecutionCode[] = [
  "SYNC_DEPENDENCY_NOT_FOUND",
  "SYNC_UNSUPPORTED_OPERATION",
  "SYNC_EXECUTION_CONFLICT",
  "SYNC_ITEM_FAILED",
]

function matchSyncExecutionCode(
  rawMessage: string | null | undefined
): OrganizationSyncExecutionCode | null {
  if (!rawMessage) {
    return null
  }

  for (const code of SYNC_EXECUTION_CODES) {
    if (rawMessage.includes(code)) {
      return code
    }
  }

  return null
}

// Map a stable code (or a raw raised message that contains one) to safe PT-BR
// copy. Never returns raw database/PostgREST text. Unknown -> generic fallback.
export function organizationSyncErrorMessage(
  rawCode: string | null | undefined
): string {
  const syncCode = matchSyncExecutionCode(rawCode)

  if (syncCode) {
    return SYNC_EXECUTION_MESSAGES[syncCode]
  }

  // Delegate all shared org-mutation codes (and UNKNOWN fallback) to the
  // canonical copy map — no duplicated wording.
  return publicMutationMessage(toMutationErrorCode(rawCode))
}

// Thrown when the whole execution is refused (auth, tenant, or execution-intent
// conflict) rather than failing per item. Carries only safe PT-BR copy.
export class OrganizationSyncExecutionError extends Error {
  readonly rawCode: string

  constructor(rawCode: string | null | undefined) {
    super(organizationSyncErrorMessage(rawCode))
    this.name = "OrganizationSyncExecutionError"
    this.rawCode = rawCode ?? "UNKNOWN"
  }
}
