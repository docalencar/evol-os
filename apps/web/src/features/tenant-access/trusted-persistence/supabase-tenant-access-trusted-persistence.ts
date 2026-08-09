import type {
  InvitationAcceptancePersistenceResult,
  InvitationPersistenceResult,
  MembershipDeactivationPersistenceResult,
  MembershipRolePersistenceResult,
  OwnershipTransferPersistenceResult,
  TenantAccessApplicationResult,
  TenantAccessStableErrorCode,
} from "../application/contracts"
import type { TenantAccessTrustedPersistence } from "../application/ports"

export interface TenantAccessRpcClient {
  rpc(name: string, parameters: Readonly<Record<string, unknown>>): PromiseLike<Readonly<{ data: unknown; error: unknown }>>
}

type RpcEnvelope = Readonly<{
  status: "succeeded" | "idempotent_retry" | "conflict" | "denied" | "known_failure"
  operationId?: string
  code?: string
  result?: unknown
}>

const DENIED_CODES = new Set([
  "AUTHENTICATION_REQUIRED",
  "OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER",
  "TENANT_AUTHORIZATION_DENIED",
  "TENANT_OWNER_AUTHORIZATION_INVALID",
])
const CONFLICT_CODES = new Set([
  "ACTIVE_MEMBERSHIP_REQUIRES_EXACTLY_ONE_PERSON",
  "LAST_ACTIVE_OWNER_REQUIRED",
  "TENANT_CONFLICT",
  "TENANT_IDEMPOTENCY_CONFLICT",
  "TENANT_MEMBERSHIP_ALREADY_EXISTS",
  "TENANT_PERSON_ALREADY_LINKED",
])
const KNOWN_FAILURE_CODES = new Set([
  "TENANT_INVITE_ALREADY_ACCEPTED",
  "TENANT_INVITE_EXPIRED",
  "TENANT_INVITE_IDENTITY_INVALID",
  "TENANT_INVITE_INVALID",
  "TENANT_INVITE_NOT_FOUND",
  "TENANT_INVITE_REVOKED",
  "TENANT_MEMBERSHIP_NOT_FOUND",
  "TENANT_OPERATION_INVALID",
  "TENANT_ROLE_INVALID",
])
const STABLE_CODES = new Set([...DENIED_CODES, ...CONFLICT_CODES, ...KNOWN_FAILURE_CODES])

function errorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("message" in error) || typeof error.message !== "string") return null
  return error.message.match(/[A-Z][A-Z0-9_]{2,}/)?.[0] ?? null
}

function failureFromError<T>(error: unknown): TenantAccessApplicationResult<T> {
  const code = errorCode(error)
  if (!code || !isStableCode(code)) return { status: "unexpected_persistence_failure", code: "TENANT_ACCESS_PERSISTENCE_FAILED" }
  if (DENIED_CODES.has(code)) return { status: "denied", code }
  if (CONFLICT_CODES.has(code)) return { status: "conflict", code }
  return { status: "known_failure", code }
}

function isStableCode(code: string): code is TenantAccessStableErrorCode {
  return STABLE_CODES.has(code)
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function mapEnvelope<T>(data: unknown, validResult: (value: unknown) => value is T): TenantAccessApplicationResult<T> {
  if (!isRecord(data) || typeof data.status !== "string") return { status: "unexpected_persistence_failure", code: "TENANT_ACCESS_INVALID_RESULT" }
  const envelope = data as RpcEnvelope
  if ((envelope.status === "succeeded" || envelope.status === "idempotent_retry") && typeof envelope.operationId === "string" && validResult(envelope.result)) {
    return { status: envelope.status, operationId: envelope.operationId, result: envelope.result }
  }
  if ((envelope.status === "conflict" || envelope.status === "denied" || envelope.status === "known_failure") && typeof envelope.code === "string" && isStableCode(envelope.code)) {
    const operation = typeof envelope.operationId === "string"
      ? { operationId: envelope.operationId }
      : {}
    if (envelope.status === "conflict") {
      return { status: "conflict", ...operation, code: envelope.code }
    }
    if (envelope.status === "denied") {
      return { status: "denied", ...operation, code: envelope.code }
    }
    return { status: "known_failure", ...operation, code: envelope.code }
  }
  return { status: "unexpected_persistence_failure", code: "TENANT_ACCESS_INVALID_RESULT" }
}

const isIssuedInvitation = (value: unknown): value is InvitationPersistenceResult =>
  isRecord(value) && typeof value.invitationId === "string" && value.status === "pending" &&
  value.generation === 1 && typeof value.expiresAt === "string"
const isResentInvitation = (value: unknown): value is InvitationPersistenceResult =>
  isRecord(value) && typeof value.invitationId === "string" && value.status === "pending" &&
  typeof value.generation === "number"
const isRevokedInvitation = (value: unknown): value is InvitationPersistenceResult =>
  isRecord(value) && typeof value.invitationId === "string" && value.status === "revoked"
const isAcceptance = (value: unknown): value is InvitationAcceptancePersistenceResult =>
  isRecord(value) && typeof value.invitationId === "string" && typeof value.membershipId === "string" && value.status === "accepted"
const isRoleChange = (value: unknown): value is MembershipRolePersistenceResult =>
  isRecord(value) && typeof value.membershipId === "string" &&
  ["owner", "admin", "hr", "manager", "employee"].includes(String(value.role))
const isDeactivation = (value: unknown): value is MembershipDeactivationPersistenceResult =>
  isRecord(value) && typeof value.membershipId === "string" && value.status === "inactive" && (typeof value.personId === "string" || value.personId === null)
const isTransfer = (value: unknown): value is OwnershipTransferPersistenceResult =>
  isRecord(value) && typeof value.targetMembershipId === "string" && value.targetRole === "owner" && typeof value.actorDemoted === "boolean"

export function createSupabaseTenantAccessTrustedPersistence(database: TenantAccessRpcClient): TenantAccessTrustedPersistence {
  async function execute<T>(name: string, parameters: Readonly<Record<string, unknown>>, validator: (value: unknown) => value is T): Promise<TenantAccessApplicationResult<T>> {
    try {
      const response = await database.rpc(name, parameters)
      return response.error ? failureFromError(response.error) : mapEnvelope(response.data, validator)
    } catch {
      return { status: "unexpected_persistence_failure", code: "TENANT_ACCESS_PERSISTENCE_FAILED" }
    }
  }

  return {
    issueInvitation: (intent) => execute("issue_company_member_invitation_v1", {
      p_company_id: intent.companyId, p_person_id: intent.personId, p_target_email: intent.targetEmail,
      p_intended_role: intent.intendedRole, p_token_digest_hex: intent.tokenDigestHex,
      p_idempotency_key: intent.idempotencyKey, p_correlation_id: intent.correlationId,
    }, isIssuedInvitation),
    resendInvitation: (intent) => execute("resend_company_member_invitation_v1", {
      p_company_id: intent.companyId, p_invitation_id: intent.invitationId,
      p_expected_generation: intent.expectedGeneration, p_token_digest_hex: intent.tokenDigestHex,
      p_idempotency_key: intent.idempotencyKey, p_correlation_id: intent.correlationId,
    }, isResentInvitation),
    revokeInvitation: (intent) => execute("revoke_company_member_invitation_v1", {
      p_company_id: intent.companyId, p_invitation_id: intent.invitationId,
      p_expected_generation: intent.expectedGeneration, p_idempotency_key: intent.idempotencyKey,
      p_correlation_id: intent.correlationId,
    }, isRevokedInvitation),
    acceptInvitation: (intent) => execute("accept_company_member_invitation_v1", {
      p_token_digest_hex: intent.tokenDigestHex, p_idempotency_key: intent.idempotencyKey,
      p_correlation_id: intent.correlationId,
    }, isAcceptance),
    changeMembershipRole: (intent) => execute("change_company_member_role_v1", {
      p_company_id: intent.companyId, p_membership_id: intent.membershipId,
      p_expected_role: intent.expectedRole, p_expected_status: intent.expectedStatus,
      p_new_role: intent.newRole, p_idempotency_key: intent.idempotencyKey,
      p_correlation_id: intent.correlationId,
    }, isRoleChange),
    deactivateMembership: (intent) => execute("deactivate_company_membership_v1", {
      p_company_id: intent.companyId, p_membership_id: intent.membershipId,
      p_expected_role: intent.expectedRole, p_expected_status: intent.expectedStatus,
      p_idempotency_key: intent.idempotencyKey, p_correlation_id: intent.correlationId,
    }, isDeactivation),
    transferOwnership: (intent) => execute("transfer_company_ownership_v1", {
      p_company_id: intent.companyId, p_target_membership_id: intent.targetMembershipId,
      p_expected_target_role: intent.expectedTargetRole, p_expected_actor_role: intent.expectedActorRole,
      p_demote_actor: intent.demoteActor, p_idempotency_key: intent.idempotencyKey,
      p_correlation_id: intent.correlationId,
    }, isTransfer),
  }
}
