import { AuthorizationError } from "./authorization-error"
import type { CurrentUserContext } from "./current-user-context"
import { PERMISSION_CATALOG } from "./permission-catalog"

const ADMINISTRATIVE_ROLES = new Set(["owner", "admin", "hr"])

export type AdministrativeReadRequest = Readonly<{
  companyId: string
  scope: string
  scopeId: string
  reason: string
}>

export interface AdministrativeReadGateway<Result> {
  read(request: AdministrativeReadRequest): Promise<Result>
}

export class SecureAdministrativeReadService<Result> {
  constructor(
    private readonly currentUser: CurrentUserContext,
    private readonly gateway: AdministrativeReadGateway<Result>
  ) {}

  read(request: AdministrativeReadRequest): Promise<Result> {
    if (
      this.currentUser.companyId !== request.companyId ||
      !ADMINISTRATIVE_ROLES.has(this.currentUser.role)
    ) {
      throw new AuthorizationError(
        PERMISSION_CATALOG.SENSITIVE_DATA_ADMINISTRATIVE_READ
      )
    }

    const reason = request.reason.trim()

    if (!/^[a-z][a-z0-9_]{2,79}$/.test(reason)) {
      throw new Error("ADMINISTRATIVE_READ_REASON_REQUIRED")
    }

    return this.gateway.read({
      ...request,
      reason,
    })
  }
}

export function isAdministrativeRole(
  role: CurrentUserContext["role"]
): boolean {
  return ADMINISTRATIVE_ROLES.has(role)
}
