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

export type TenantAccessApplicationResult<T> =
  | Readonly<{ status: "succeeded" | "idempotent_retry"; operationId: string; result: T }>
  | Readonly<{ status: "conflict"; operationId?: string; code: string }>
  | Readonly<{ status: "denied"; operationId?: string; code: string }>
  | Readonly<{ status: "known_failure"; operationId?: string; code: string }>
  | Readonly<{
      status: "unexpected_persistence_failure"
      code: "TENANT_ACCESS_PERSISTENCE_FAILED" | "TENANT_ACCESS_INVALID_RESULT"
    }>
