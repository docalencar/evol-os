import {
  createAuthorizationAuditEvent,
  type AuthorizationAuditEvent,
} from "./authorization-audit-event"
import { AuthorizationError } from "./authorization-error"
import type { CurrentUserContext } from "./current-user-context"
import type { Permission } from "./permission-catalog"
import { roleHasPermission } from "./permission-resolver"

export type AuthorizationAuditSink = (
  event: AuthorizationAuditEvent
) => void | Promise<void>

export interface AuthorizationGuard {
  requirePermission(
    permission: Permission,
    companyId: string
  ): Promise<AuthorizationAuditEvent>
}

export class AuthorizationService implements AuthorizationGuard {
  constructor(
    private readonly currentUser: CurrentUserContext,
    private readonly auditSink?: AuthorizationAuditSink
  ) {}

  can(permission: Permission, companyId: string): boolean {
    return this.currentUser.companyId === companyId &&
      roleHasPermission(this.currentUser.role, permission)
  }

  async requirePermission(
    permission: Permission,
    companyId: string
  ): Promise<AuthorizationAuditEvent> {
    const allowed = this.can(permission, companyId)
    const event = createAuthorizationAuditEvent({
      userId: this.currentUser.userId,
      companyId,
      role: this.currentUser.role,
      permission,
      decision: allowed ? "allowed" : "denied",
      occurredAt: new Date(),
    })

    await this.auditSink?.(event)

    if (!allowed) {
      throw new AuthorizationError(permission)
    }

    return event
  }
}
