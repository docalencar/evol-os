export const PERMISSION_CATALOG = Object.freeze({
  ORGANIZATION_PLANNING_READ: "organization-planning:read",
  ORGANIZATION_PLANNING_MANAGE: "organization-planning:manage",
  ORGANIZATION_PLANNING_PUBLISH: "organization-planning:publish",
} as const)

export type Permission =
  (typeof PERMISSION_CATALOG)[keyof typeof PERMISSION_CATALOG]

export const ALL_PERMISSIONS: readonly Permission[] = Object.freeze(
  Object.values(PERMISSION_CATALOG)
)
