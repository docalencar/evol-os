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
import type { TenantAccessTrustedPersistence } from "./ports"

export class TenantAccessApplicationService {
  constructor(private readonly persistence: TenantAccessTrustedPersistence) {}

  issueInvitation(
    intent: IssueTenantInvitationIntent,
  ): Promise<TenantAccessApplicationResult<InvitationPersistenceResult>> {
    return this.persistence.issueInvitation(intent)
  }

  resendInvitation(
    intent: ResendTenantInvitationIntent,
  ): Promise<TenantAccessApplicationResult<InvitationPersistenceResult>> {
    return this.persistence.resendInvitation(intent)
  }

  revokeInvitation(
    intent: RevokeTenantInvitationIntent,
  ): Promise<TenantAccessApplicationResult<InvitationPersistenceResult>> {
    return this.persistence.revokeInvitation(intent)
  }

  acceptInvitation(
    intent: AcceptTenantInvitationIntent,
  ): Promise<TenantAccessApplicationResult<InvitationAcceptancePersistenceResult>> {
    return this.persistence.acceptInvitation(intent)
  }

  changeMembershipRole(
    intent: ChangeTenantMembershipRoleIntent,
  ): Promise<TenantAccessApplicationResult<MembershipRolePersistenceResult>> {
    return this.persistence.changeMembershipRole(intent)
  }

  deactivateMembership(
    intent: DeactivateTenantMembershipIntent,
  ): Promise<TenantAccessApplicationResult<MembershipDeactivationPersistenceResult>> {
    return this.persistence.deactivateMembership(intent)
  }

  transferOwnership(
    intent: TransferTenantOwnershipIntent,
  ): Promise<TenantAccessApplicationResult<OwnershipTransferPersistenceResult>> {
    return this.persistence.transferOwnership(intent)
  }
}
