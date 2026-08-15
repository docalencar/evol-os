import type { TenantMembershipRole } from "../application"

export type PeopleAccessStateRow = Readonly<{
  personId: string
  membershipRole: TenantMembershipRole | null
  membershipStatus: "active" | "inactive" | "invited" | null
  invitationId: string | null
  invitationRole: TenantMembershipRole | null
  invitationStatus: "pending" | "expired" | "revoked" | "accepted" | null
  invitationGeneration: number | null
  invitationExpiresAt: string | null
}>

export type PeopleAccessStateResult =
  | Readonly<{ status: "available"; rows: readonly PeopleAccessStateRow[] }>
  | Readonly<{ status: "unavailable" }>

export type PeopleAccessStatus =
  | "no_access"
  | "invitation_pending"
  | "invitation_expired"
  | "invitation_revoked"
  | "access_active"
  | "access_inactive"
  | "access_pending"
  | "unavailable"

export type PeopleAccessStateViewModel = Readonly<{
  status: PeopleAccessStatus
  label: string
  roleLabel: string | null
  canIssue: boolean
  canResend: boolean
  canRevoke: boolean
  invitationId: string | null
  invitationGeneration: number | null
}>
