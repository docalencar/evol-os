import type { DevelopmentTemplateApplicationResolution } from "../resolver"

export type TrustedTemplateApplicationPersistenceResult =
  | Readonly<{
      status: "created" | "idempotent_retry"
      applicationId: string
      planId: string
      snapshotId: string
    }>
  | Readonly<{
      status: "idempotency_conflict"
      applicationId: string
      code: "IDEMPOTENCY_FINGERPRINT_CONFLICT"
    }>
  | Readonly<{
      status: "known_failure"
      applicationId: string
      code: string
    }>
  | Readonly<{
      status:
        | "authorization_failure"
        | "integrity_failure"
        | "persistence_failure"
      code: string
    }>

export interface TrustedTemplateApplicationPersistence {
  persist(
    resolution: DevelopmentTemplateApplicationResolution,
  ): Promise<TrustedTemplateApplicationPersistenceResult>
}

export interface TrustedPersistenceDatabase {
  rpc(
    name: string,
    parameters: Readonly<Record<string, unknown>>,
  ): PromiseLike<Readonly<{ data: unknown; error: unknown }>>
}
