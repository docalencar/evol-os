import type { Permission } from "./permission-catalog"

export class AuthorizationError extends Error {
  readonly code = "AUTHORIZATION_PERMISSION_DENIED"

  constructor(
    readonly permission: Permission,
    message = "Você não possui permissão para realizar esta ação."
  ) {
    super(message)
    this.name = "AuthorizationError"
  }
}
