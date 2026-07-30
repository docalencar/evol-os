import type { Permission } from "./permission-catalog"
import type { CorporateRole } from "./roles"

export type AuthorizationDecision = "allowed" | "denied"

export type AuthorizationAuditEvent = Readonly<{
  type: "authorization.permission_checked"
  userId: string
  companyId: string
  role: CorporateRole
  permission: Permission
  decision: AuthorizationDecision
  occurredAt: Date
}>

export function createAuthorizationAuditEvent(
  input: Omit<AuthorizationAuditEvent, "type">
): AuthorizationAuditEvent {
  return Object.freeze({
    type: "authorization.permission_checked",
    ...input,
  })
}
