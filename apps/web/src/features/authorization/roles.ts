export const CORPORATE_ROLES = [
  "owner",
  "admin",
  "hr",
  "manager",
  "employee",
] as const

export type CorporateRole = (typeof CORPORATE_ROLES)[number]

export function isCorporateRole(value: unknown): value is CorporateRole {
  return typeof value === "string" &&
    CORPORATE_ROLES.some((role) => role === value)
}
