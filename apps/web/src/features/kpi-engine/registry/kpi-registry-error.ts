export const KPI_REGISTRY_ERROR_CODES = [
  "INVALID_DEFINITION_VERSION",
  "DUPLICATE_DEFINITION_ID_VERSION",
  "DUPLICATE_DEFINITION_KEY_VERSION",
  "OVERLAPPING_DEFINITION_PERIOD",
  "MULTIPLE_ACTIVE_DEFINITIONS",
  "DEFINITION_NOT_FOUND",
  "ACTIVE_DEFINITION_NOT_FOUND",
  "INVALID_EFFECTIVE_PERIOD",
  "DEFINITION_ID_MISMATCH",
  "DEFINITION_KEY_MISMATCH",
] as const

export type KPIRegistryErrorCode =
  (typeof KPI_REGISTRY_ERROR_CODES)[number]

export class KPIRegistryError extends Error {
  constructor(
    readonly code: KPIRegistryErrorCode,
    message: string
  ) {
    super(message)
    this.name = "KPIRegistryError"
  }
}
