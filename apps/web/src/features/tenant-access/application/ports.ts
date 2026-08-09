import type {
  AcceptTenantInvitationIntent,
  ChangeTenantMembershipRoleIntent,
  DeactivateTenantMembershipIntent,
  InvitationAcceptancePersistenceResult,
  InvitationPersistenceResult,
  IssueTenantInvitationIntent,
  MembershipDeactivationPersistenceResult,
  MembershipRolePersistenceResult,
  OwnershipTransferPersistenceResult,
  ResendTenantInvitationIntent,
  RevokeTenantInvitationIntent,
  TenantAccessApplicationResult,
  TransferTenantOwnershipIntent,
} from "./contracts"

export interface TenantAccessTrustedPersistence {
  issueInvitation(intent: IssueTenantInvitationIntent): Promise<TenantAccessApplicationResult<InvitationPersistenceResult>>
  resendInvitation(intent: ResendTenantInvitationIntent): Promise<TenantAccessApplicationResult<InvitationPersistenceResult>>
  revokeInvitation(intent: RevokeTenantInvitationIntent): Promise<TenantAccessApplicationResult<InvitationPersistenceResult>>
  acceptInvitation(intent: AcceptTenantInvitationIntent): Promise<TenantAccessApplicationResult<InvitationAcceptancePersistenceResult>>
  changeMembershipRole(intent: ChangeTenantMembershipRoleIntent): Promise<TenantAccessApplicationResult<MembershipRolePersistenceResult>>
  deactivateMembership(intent: DeactivateTenantMembershipIntent): Promise<TenantAccessApplicationResult<MembershipDeactivationPersistenceResult>>
  transferOwnership(intent: TransferTenantOwnershipIntent): Promise<TenantAccessApplicationResult<OwnershipTransferPersistenceResult>>
}
