export type TenantMembershipRole = "owner" | "admin" | "hr" | "manager" | "employee"

type TenantAccessIntentContext = Readonly<{
  idempotencyKey: string
  correlationId: string
}>

export type IssueTenantInvitationIntent = TenantAccessIntentContext & Readonly<{
  companyId: string
  personId: string
  targetEmail: string
  intendedRole: TenantMembershipRole
  tokenDigestHex: string
}>

export type ResendTenantInvitationIntent = TenantAccessIntentContext & Readonly<{
  companyId: string
  invitationId: string
  expectedGeneration: number
  tokenDigestHex: string
}>

export type RevokeTenantInvitationIntent = TenantAccessIntentContext & Readonly<{
  companyId: string
  invitationId: string
  expectedGeneration: number
}>

export type AcceptTenantInvitationIntent = TenantAccessIntentContext & Readonly<{
  tokenDigestHex: string
}>

export type ChangeTenantMembershipRoleIntent = TenantAccessIntentContext & Readonly<{
  companyId: string
  membershipId: string
  expectedRole: TenantMembershipRole
  expectedStatus: "active" | "inactive" | "invited"
  newRole: TenantMembershipRole
}>

export type DeactivateTenantMembershipIntent = TenantAccessIntentContext & Readonly<{
  companyId: string
  membershipId: string
  expectedRole: TenantMembershipRole
  expectedStatus: "active" | "inactive" | "invited"
}>

export type TransferTenantOwnershipIntent = TenantAccessIntentContext & Readonly<{
  companyId: string
  targetMembershipId: string
  expectedTargetRole: TenantMembershipRole
  expectedActorRole: TenantMembershipRole
  demoteActor: boolean
}>

export type InvitationPersistenceResult = Readonly<{
  invitationId: string
  status: "pending" | "revoked"
  generation?: number
  expiresAt?: string
}>

export type ResentInvitationPersistenceResult = Readonly<{
  invitationId: string
  status: "pending"
  generation: number
  destinationEmail: string
  intendedRole: TenantMembershipRole
  expiresAt: string
}>

export type InvitationAcceptancePersistenceResult = Readonly<{
  invitationId: string
  membershipId: string
  personId?: string
  status: "accepted"
}>

export type MembershipRolePersistenceResult = Readonly<{
  membershipId: string
  role: TenantMembershipRole
}>

export type MembershipDeactivationPersistenceResult = Readonly<{
  membershipId: string
  personId: string | null
  status: "inactive"
}>

export type OwnershipTransferPersistenceResult = Readonly<{
  targetMembershipId: string
  targetRole: "owner"
  actorDemoted: boolean
}>

export type TenantAccessStableErrorCode =
  | "ACTIVE_MEMBERSHIP_REQUIRES_EXACTLY_ONE_PERSON"
  | "AUTHENTICATION_REQUIRED"
  | "LAST_ACTIVE_OWNER_REQUIRED"
  | "OWNER_ADMINISTRATION_REQUIRES_ACTIVE_OWNER"
  | "TENANT_AUTHORIZATION_DENIED"
  | "TENANT_CONFLICT"
  | "TENANT_IDEMPOTENCY_CONFLICT"
  | "TENANT_INVITE_ALREADY_ACCEPTED"
  | "TENANT_INVITE_EXPIRED"
  | "TENANT_INVITE_IDENTITY_INVALID"
  | "TENANT_INVITE_INVALID"
  | "TENANT_INVITE_NOT_FOUND"
  | "TENANT_INVITE_REVOKED"
  | "TENANT_MEMBERSHIP_ALREADY_EXISTS"
  | "TENANT_MEMBERSHIP_NOT_FOUND"
  | "TENANT_OPERATION_INVALID"
  | "TENANT_OWNER_AUTHORIZATION_INVALID"
  | "TENANT_PERSON_ALREADY_LINKED"
  | "TENANT_ROLE_INVALID"

export type TenantAccessApplicationResult<T> =
  | Readonly<{ status: "succeeded" | "idempotent_retry"; operationId: string; result: T }>
  | Readonly<{ status: "conflict"; operationId?: string; code: TenantAccessStableErrorCode }>
  | Readonly<{ status: "denied"; operationId?: string; code: TenantAccessStableErrorCode }>
  | Readonly<{ status: "known_failure"; operationId?: string; code: TenantAccessStableErrorCode }>
  | Readonly<{
      status: "unexpected_persistence_failure"
      code: "TENANT_ACCESS_PERSISTENCE_FAILED" | "TENANT_ACCESS_INVALID_RESULT"
    }>
