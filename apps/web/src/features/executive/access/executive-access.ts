import {
  isAdministrativeRole,
  type CorporateRole,
} from "@/features/authorization"

export function canAccessExecutive(role: CorporateRole): boolean {
  return isAdministrativeRole(role)
}

export function requireExecutiveAccess(
  role: CorporateRole,
  deny: () => never,
): void {
  if (!canAccessExecutive(role)) {
    deny()
  }
}
