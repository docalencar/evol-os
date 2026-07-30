import {
  ALL_PERMISSIONS,
  PERMISSION_CATALOG,
  type Permission,
} from "./permission-catalog"
import type { CorporateRole } from "./roles"

const ROLE_PERMISSIONS: Readonly<Record<CorporateRole, readonly Permission[]>> =
  Object.freeze({
    owner: ALL_PERMISSIONS,
    admin: ALL_PERMISSIONS,
    hr: ALL_PERMISSIONS,
    manager: Object.freeze([PERMISSION_CATALOG.ORGANIZATION_PLANNING_READ]),
    employee: Object.freeze([PERMISSION_CATALOG.ORGANIZATION_PLANNING_READ]),
  })

export function resolvePermissions(
  role: CorporateRole
): readonly Permission[] {
  return ROLE_PERMISSIONS[role]
}

export function roleHasPermission(
  role: CorporateRole,
  permission: Permission
): boolean {
  return resolvePermissions(role).includes(permission)
}
