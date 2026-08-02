import type { CurrentUserContext } from "@/features/authorization"

export class NotificationAuthorizationError extends Error {
  constructor(message = "Acesso à notificação não autorizado.") {
    super(message)
    this.name = "NotificationAuthorizationError"
  }
}

export function requireNotificationSelfAccess(
  actor: CurrentUserContext,
  companyId: string,
  recipientId: string
): void {
  if (actor.companyId !== companyId || actor.userId !== recipientId) {
    throw new NotificationAuthorizationError()
  }
}

export function requireNotificationAdministrativeAccess(
  actor: CurrentUserContext,
  companyId: string
): void {
  if (
    actor.companyId !== companyId ||
    (actor.role !== "owner" && actor.role !== "admin")
  ) {
    throw new NotificationAuthorizationError(
      "Operação administrativa de notificações não autorizada."
    )
  }
}
