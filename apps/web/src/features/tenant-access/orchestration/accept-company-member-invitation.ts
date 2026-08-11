import "server-only"

import { z } from "zod"

import type {
  InvitationAcceptancePersistenceResult,
  TenantAccessApplicationResult,
  TenantAccessApplicationService,
  TenantAccessStableErrorCode,
} from "../application"

// Raw invitation token: 32 random bytes encoded as unpadded base64url (43 chars).
// Rejects padding ("="), non-url-safe base64 ("+", "/") and any wrong length.
const RAW_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

const acceptInvitationInputSchema = z
  .object({
    rawToken: z.string().regex(RAW_TOKEN_PATTERN),
  })
  .strict()

export type AcceptCompanyMemberInvitationInput = z.input<typeof acceptInvitationInputSchema>

export type AcceptCompanyMemberInvitationResult =
  | Readonly<{ status: "invitation_accepted"; correlationId: string }>
  | Readonly<{
      status: "conflict"
      reason?: "already_accepted" | "already_member" | "person_linked_other"
      message: string
    }>
  | Readonly<{ status: "denied"; message: string }>
  | Readonly<{ status: "expired"; message: string }>
  | Readonly<{ status: "revoked"; message: string }>
  | Readonly<{ status: "not_found"; message: string }>
  | Readonly<{ status: "session_expired" }>
  | Readonly<{ status: "invalid_input"; message: string }>
  | Readonly<{ status: "failed"; correlationId?: string; message: string }>

export type AcceptInvitationAcceptorContextResult =
  | Readonly<{ status: "authenticated" }>
  | Readonly<{ status: "session_expired" }>

type AcceptCompanyMemberInvitationDependencies = Readonly<{
  loadAcceptorContext: () => Promise<AcceptInvitationAcceptorContextResult>
  createApplicationService: () => Promise<Pick<TenantAccessApplicationService, "acceptInvitation">>
  digestToken: (rawToken: string) => string
  generateId: () => string
}>

const SAFE_FAILURE_MESSAGE = "Não foi possível concluir a operação."

export async function acceptCompanyMemberInvitation(
  dependencies: AcceptCompanyMemberInvitationDependencies,
  input: unknown,
): Promise<AcceptCompanyMemberInvitationResult> {
  const parsed = acceptInvitationInputSchema.safeParse(input)
  if (!parsed.success) return { status: "invalid_input", message: "O convite é inválido." }

  let context: AcceptInvitationAcceptorContextResult
  try {
    context = await dependencies.loadAcceptorContext()
  } catch {
    return { status: "failed", message: SAFE_FAILURE_MESSAGE }
  }
  if (context.status !== "authenticated") return context

  // Server-only: derive the digest and never let the raw token cross the boundary.
  const tokenDigestHex = dependencies.digestToken(parsed.data.rawToken)
  const idempotencyKey = dependencies.generateId()
  const correlationId = dependencies.generateId()

  let persistence: TenantAccessApplicationResult<InvitationAcceptancePersistenceResult>
  try {
    const service = await dependencies.createApplicationService()
    persistence = await service.acceptInvitation({
      tokenDigestHex,
      idempotencyKey,
      correlationId,
    })
  } catch {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }

  if (persistence.status === "succeeded" || persistence.status === "idempotent_retry") {
    return { status: "invitation_accepted", correlationId }
  }
  return mapPersistenceFailure(persistence, correlationId)
}

function mapPersistenceFailure(
  result: TenantAccessApplicationResult<InvitationAcceptancePersistenceResult>,
  correlationId: string,
): AcceptCompanyMemberInvitationResult {
  if ("result" in result) return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  if (result.status === "denied") {
    if (result.code === "AUTHENTICATION_REQUIRED") return { status: "session_expired" }
    // Email/identity mismatch is intentionally masked as a generic denial.
    return { status: "denied", message: "Não foi possível validar este convite para a sua conta." }
  }
  if (result.status === "unexpected_persistence_failure") {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }
  return mapStableFailure(result.code, result.status, correlationId)
}

function mapStableFailure(
  code: TenantAccessStableErrorCode,
  status: "conflict" | "known_failure",
  correlationId: string,
): AcceptCompanyMemberInvitationResult {
  if (code === "TENANT_INVITE_REVOKED") {
    return { status: "revoked", message: "Este convite foi revogado." }
  }
  if (code === "TENANT_INVITE_EXPIRED") {
    return { status: "expired", message: "Este convite expirou." }
  }
  if (code === "TENANT_INVITE_ALREADY_ACCEPTED") {
    return { status: "conflict", reason: "already_accepted", message: "Este convite já foi aceito." }
  }
  if (code === "TENANT_PERSON_ALREADY_LINKED") {
    return { status: "conflict", reason: "person_linked_other", message: "Esta pessoa já está vinculada a outra conta." }
  }
  if (code === "TENANT_MEMBERSHIP_ALREADY_EXISTS") {
    return { status: "conflict", reason: "already_member", message: "Você já possui acesso a esta empresa." }
  }
  if (code === "TENANT_INVITE_NOT_FOUND" || code === "TENANT_INVITE_IDENTITY_INVALID") {
    return { status: "not_found", message: "Convite não encontrado ou indisponível." }
  }
  if (code === "TENANT_INVITE_INVALID" || code === "TENANT_ROLE_INVALID" || code === "TENANT_OPERATION_INVALID") {
    return { status: "invalid_input", message: "O convite é inválido." }
  }
  if (code === "AUTHENTICATION_REQUIRED") {
    return { status: "session_expired" }
  }
  if (code === "TENANT_IDEMPOTENCY_CONFLICT") {
    return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
  }
  if (status === "conflict") {
    return { status: "conflict", message: "O convite não pôde ser aceito no estado atual." }
  }
  return { status: "failed", correlationId, message: SAFE_FAILURE_MESSAGE }
}

export type { AcceptCompanyMemberInvitationDependencies }
